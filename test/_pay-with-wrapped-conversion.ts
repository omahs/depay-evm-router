import deploy from './_helpers/deploy'
import now from './_helpers/now'
import Token from '@depay/web3-tokens-evm'
import Blockchains from '@depay/web3-blockchains'
import { ethers } from 'hardhat'
import { expect } from 'chai'

export default ({ blockchain })=>{

  const NATIVE = Blockchains[blockchain].currency.address
  const WRAPPED = Blockchains[blockchain].wrapped.address
  const ZERO = Blockchains[blockchain].zero
  const provider = ethers.provider
  const PAY = 'pay((uint256,bool,uint256,uint256,address,address,address,address,address,uint8,uint8,bytes,bytes,uint256))'

  describe(`DePayRouterV2 on ${blockchain}`, ()=> {

    describe(`pay with WRAPPED conversion`, ()=> {

      let wallets
      let router
      let deadline
      let wrapperContract

      beforeEach(async ()=>{
        wallets = await ethers.getSigners()
        deadline = now()+ 86400 // 1 day
        wrapperContract = new ethers.Contract(WRAPPED, Token[blockchain].WRAPPED, wallets[0])
      })

      it('deploys router successfully', async ()=> {
        router = await deploy()
      })

      it('approves WRAPPER contract as exchange to convert payments', async ()=> {
        await router.connect(wallets[0]).enable(WRAPPED, true)
      })

      it('wraps NATIVE to WRAPPED and pays out WRAPPED', async ()=>{
        const amountIn = 1000000000
        const paymentAmount = 900000000
        const feeAmount = 100000000

        const callData = wrapperContract.interface.encodeFunctionData("deposit", [])

        const paymentReceiverBalanceBefore = await wrapperContract.balanceOf(wallets[1].address)
        const feeReceiverBalanceBefore = await wrapperContract.balanceOf(wallets[2].address)

        await router.connect(wallets[0])[PAY]({
          amountIn: amountIn,
          paymentAmount: paymentAmount,
          feeAmount: feeAmount,
          tokenInAddress: NATIVE,
          exchangeAddress: WRAPPED,
          tokenOutAddress: WRAPPED,
          paymentReceiverAddress: wallets[1].address,
          feeReceiverAddress: wallets[2].address,
          exchangeType: 0,
          receiverType: 0,
          exchangeCallData: callData,
          receiverCallData: ZERO,
          deadline,
        }, { value: 1000000000 })

        const paymentReceiverBalanceAfter = await await wrapperContract.balanceOf(wallets[1].address)
        const feeReceiverBalanceAfter = await await wrapperContract.balanceOf(wallets[2].address)

        expect(paymentReceiverBalanceAfter).to.eq(paymentReceiverBalanceBefore.add(paymentAmount))
        expect(feeReceiverBalanceAfter).to.eq(feeReceiverBalanceBefore.add(feeAmount))
      })

      it('unwraps WRAPPED to NATIVE and pays out NATIVE', async ()=>{

        const amountIn = 1000000000
        const paymentAmount = 900000000
        const feeAmount = 100000000

        const callData = wrapperContract.interface.encodeFunctionData("withdraw", [amountIn])

        const paymentReceiverBalanceBefore = await provider.getBalance(wallets[1].address)
        const feeReceiverBalanceBefore = await provider.getBalance(wallets[2].address)

        await wrapperContract.connect(wallets[0]).deposit({ value: amountIn })
        await wrapperContract.connect(wallets[0]).approve(router.address, amountIn)

        await router.connect(wallets[0])[PAY]({
          amountIn: amountIn,
          paymentAmount: paymentAmount,
          feeAmount: feeAmount,
          tokenInAddress: WRAPPED,
          exchangeAddress: WRAPPED,
          tokenOutAddress: NATIVE,
          paymentReceiverAddress: wallets[1].address,
          feeReceiverAddress: wallets[2].address,
          exchangeType: 0,
          receiverType: 0,
          exchangeCallData: callData,
          receiverCallData: ZERO,
          deadline,
        })

        const paymentReceiverBalanceAfter = await await provider.getBalance(wallets[1].address)
        const feeReceiverBalanceAfter = await await provider.getBalance(wallets[2].address)

        expect(paymentReceiverBalanceAfter).to.eq(paymentReceiverBalanceBefore.add(paymentAmount))
        expect(feeReceiverBalanceAfter).to.eq(feeReceiverBalanceBefore.add(feeAmount))
      })
    })
  })
}
