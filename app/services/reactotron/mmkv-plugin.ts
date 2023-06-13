import { MMKVInstance } from "react-native-mmkv-storage"
import { Reactotron } from "reactotron-core-client"

interface MmkvPluginConfig {
  storage: MMKVInstance
  ignore?: string[]
}

/**
 * Reactotron plugin for adapting MMKV storage to use AsyncStorage.
 *
 * @example
 * import { MMKVLoader } from "react-native-mmkv-storage"
 *
 * // create your storage instance
 * const storage = new MMKVLoader().initialize()
 *
 * // pass your instance to the plugin
 * Reactotron.use(mmkvPlugin({ storage }))
 */
export default function mmkvPlugin(config: MmkvPluginConfig) {
  const ignore = config.ignore ?? []

  return (reactotron: Reactotron) => {
    /**
     * Hijacking asyncStorage plugin
     * @see https://github.com/infinitered/reactotron/blob/beta/lib/reactotron-react-native/src/plugins/asyncStorage.ts#LL27C1-L30C1
     */
    const sendToReactotron = (action: string, data?: any) => {
      reactotron.send("asyncStorage.mutation", { action, data })
    }

    /** MMKV data types */
    const dataTypes = ["string", "number", "object", "array", "boolean"] as const

    return {
      onConnect() {
        dataTypes.forEach((type) => {
          // example adapted from https://rnmmkv.vercel.app/#/transactionmanager?id=_1-simple-developer-tooling
          config.storage.transactions.register(type, "onwrite", (key, value) => {
            // setItem from async storage https://github.com/infinitered/reactotron/blob/beta/lib/reactotron-react-native/src/plugins/asyncStorage.ts#L34
            if (ignore.indexOf(key) < 0) {
              sendToReactotron("setItem", { key, value })
            }
          })

          config.storage.transactions.register(type, "ondelete", (key) => {
            // removeItem from async storage https://github.com/infinitered/reactotron/blob/beta/lib/reactotron-react-native/src/plugins/asyncStorage.ts#L43
            if (ignore.indexOf(key) < 0) {
              sendToReactotron("removeItem", { key })
            }
          })
        })
      },
    }
  }
}
