import { Provider, WebSocketProvider } from '@wagmi/core'
import { multicallProvider as _multicallProvider, MulticallProviderOptions } from './index'

export const multicallProvider =
  <TProvider extends Provider | WebSocketProvider>(
    _provider: ({ chainId }: { chainId?: number }) => TProvider,
    options?: Partial<MulticallProviderOptions>,
  ) =>
  ({ chainId }: { chainId?: number }): TProvider => {
    const provider = _provider({ chainId })
    const chain = provider.chains?.find((c) => c.id === chainId)
    const multicallAddress = chain?.contracts?.multicall3?.address
    return _multicallProvider(provider, {
      ...options,
      ...(multicallAddress && { multicall3: multicallAddress }),
    })
  }
