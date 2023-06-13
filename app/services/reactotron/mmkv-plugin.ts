import { MMKVInstance } from "react-native-mmkv-storage"
import type {
  MutatorFunction,
  TransactionType,
} from "react-native-mmkv-storage/dist/src/transactions"
import type { Reactotron } from "reactotron-core-client"

interface MmkvPluginConfig {
  /**
   * MMKV storage instance
   * @example
   * import { MMKVLoader } from "react-native-mmkv-storage"
   * const storage = new MMKVLoader().initialize()
   */
  storage: MMKVInstance
  /** Storage keys you want to ignore */
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
    /** MMKV data types */
    const dataTypes = ["string", "number", "object", "array", "boolean"] as const

    return {
      onConnect() {
        dataTypes.forEach((type) => {
          // logging example adapted from https://rnmmkv.vercel.app/#/transactionmanager?id=_1-simple-developer-tooling
          const addListener = (transaction: TransactionType, mutator: MutatorFunction) => {
            config.storage.transactions.register(type, transaction, mutator)
          }

          addListener("onwrite", (key, value) => {
            if (ignore.indexOf(key) < 0) {
              const stringValue = JSON.stringify(value)
              const previewValue =
                stringValue.length > 50 ? stringValue.slice(0, 50) + "..." : stringValue

              reactotron.display({
                name: "MMKV",
                value: { key, value },
                preview: `Set "${key}" to ${previewValue}`,
              })
            }
          })

          addListener("ondelete", (key) => {
            if (ignore.indexOf(key) < 0) {
              reactotron.display({
                name: "MMKV",
                value: { key },
                preview: `Deleting "${key}"`,
              })
            }
          })
        })
      },
    }
  }
}
