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
  provider: withMulticall(provider),
  connectors: [new MetaMaskConnector({ chains })],
})
```

And thats all 😆 your calls will now be batched and sent in a multicall transaction
