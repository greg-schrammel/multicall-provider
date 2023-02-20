# multicall-provider

Save in your infura bills, aggreate multiple transactions in a single rpc call, with no extra effort

Inspired by [`0xsequence/multicall`](https://github.com/0xsequence/sequence.js/tree/master/packages/multicall), It works by wrapping an `ethers` provider and overrides the `call` method to aggregate supported transactions into a single [multicall3](https://github.com/mds1/multicall) call

```bash
npm install multicall-provider

yarn add multicall-provider

pnpm add multicall-provider
```

## Usage

- It implements a buffer with a configurable 50ms delay and aggregates all operations received within that window.
- Calls targeting different block heights (`blockTags`) are aggregated based on the blockTag
- Transactions including `from`, `value` or `gasPrice` skip aggregation and are forwarded to the underlying provider

```ts
const provider = multicallProvider(new providers.JsonRpcProvider(...), {
  batchSize: 25, // max amount of transactions per multicall call
  timeWindow: 50, // time in ms to wait for new transactions before sending
  multicall3: '' // multicall3 contract address, only the aggregate3 method is used
})
```

keep in mind it works as long as there are no `await`'s between calls

```ts
// calls won't be aggregated
const daiDecimals = await dai.decimals()
const daiBalance = await dai.balanceOf('0x507f0daa42b215273b8a063b092ff3b6d27767af')

// will be aggreated into a single rpc call
const [daiDecimals, daiBalance] = await Promise.all([
  dai.decimals(),
  dai.balanceOf('0x507f0daa42b215273b8a063b092ff3b6d27767af'),
])

// this way works too
const daiDecimals = dai.decimals()
const daiBalance = dai.balanceOf('0x507f0daa42b215273b8a063b092ff3b6d27767af')

const balance = await balancePromise
const supply = await supplyPromise
```

### Usage with Wagmi

A util to wrap your `wagmi` provider with multicall is under `multicall-provider/wagmi` as follows

```ts
import { configureChains, createClient, mainnet, WagmiConfig } from 'wagmi'
import { publicProvider } from '@wagmi/core/providers/public'
import { MetaMaskConnector } from '@wagmi/core/connectors/metaMask'

import { multicallProvider } from 'multicall-provider/wagmi'

const { chains, provider } = configureChains([mainnet], [publicProvider()])

const client = createClient({
  provider: multicallProvider(provider),
  connectors: [new MetaMaskConnector({ chains })],
})
```

All `useContractRead`s will be aggregated, but `useContractWrite`s won't

### Why

Imagine you're building an app like

```jsx
const App = () => {
  return (
    <>
      <UserBalance token="dai" />
      <UserBalance token="usdc" />
      <UserBalance token="usdt" />
    </>
  )
}
```

Inside each `<UserBalance/>` you have a `useContractRead` to fetch the balance of the token.  

This app would start by making 3 different rpc calls, you may see how this grows depending on your app. 

You could `useContractReads` on the parent and pass the balances down.  

but what if you also need to use the Dai balance in another place way down the tree?  
I mean the closer to the component using the data the better

wrapping your wagmi provider with `multicallProvider`, you don't need to worry about that, need to use the Dai balance down the tree? `wagmi` will have it cached for you already, because of the first `useContractRead`, gg

### Potential Issues

`batchSize`: eth_call has a timeout restriction at node level, if it fails with a node error, consider lowering your batch size, 25 should be fine tho
