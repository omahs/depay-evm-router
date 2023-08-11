import '@nomiclabs/hardhat-waffle'
import '@nomiclabs/hardhat-ethers'
import { sharedConfig, MNEMONIC, GNOSIS_RPC_URL } from './hardhat.config.shared'

const hardhatConfig = {
  ...sharedConfig,
  defaultNetwork: 'hardhat',
  networks: {
    hardhat: {
      accounts: {
        mnemonic: MNEMONIC!
      },
      forking: {
        url: GNOSIS_RPC_URL!,
        enabled: true
      }
    }
  }
}

export default hardhatConfig
