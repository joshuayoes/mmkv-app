import { MMKVInstance } from "react-native-mmkv-storage"
import { Reactotron } from "reactotron-core-client"

interface MmkvPluginConfig {
  storage: MMKVInstance
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
  return (reactotron: Reactotron) => {
    /** Hijacking asyncStorage.mutation key */
    const sendToReactotron = (action: string, data?: any) => {
      reactotron.send("asyncStorage.mutation", { action, data })
    }

    /** MMKV data types */
    const dataTypes = ["string", "number", "object", "array", "boolean"] as const

    return {
      onConnect() {
        dataTypes.forEach((type) => {
          config.storage.transactions.register(type, "onwrite", (key, value) => {
            sendToReactotron(key, value)
          })
        })
      },
    }
  }
}
