# with-multicall

Enchance your provider with auto multicall batching

```bash
npm install with-multicall

yarn add with-multicall

pnpm add with-multicall
```

## Usage

```ts
import { configureChains, createClient, mainnet, WagmiConfig } from 'wagmi'
import { publicProvider } from '@wagmi/core/providers/public'
import { MetaMaskConnector } from '@wagmi/core/connectors/metaMask'

import { withMulticall } from 'with-multicall'

const { chains, provider } = configureChains([mainnet], [publicProvider()])

const client = createClient({
  provider: withMulticall(provider, {
    batchSize: 25, // max amount of txs per multicall call
    timeWindow: 50, // time in ms to batch new txs before executing
  }),
  connectors: [new MetaMaskConnector({ chains })],
})
```

And thats all 😆 your calls will now be batched and sent in a multicall transaction

> **Warning**
> The api will change, this is just a poc, maybe we should be call it multicallProvider?
