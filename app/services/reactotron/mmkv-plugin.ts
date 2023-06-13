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
 * Reactotron plugin to log MMKV storage changes
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

  /** MMKV data types */
  const dataTypes = ["string", "number", "object", "array", "boolean"] as const

  /** Clean up function to unregister the listener from MMKV, to prevent memory leaks */
  type RemoveListenerFn = () => void

  /**
   * Create a listener that fires a callback for specific transitions on all MMKV data types
   * @see https://rnmmkv.vercel.app/#/transactionmanager?id=_1-simple-developer-tooling
   */
  const addListener = (
    transaction: TransactionType,
    mutator: MutatorFunction,
  ): RemoveListenerFn[] =>
    dataTypes.map((type) => {
      const removeListenerFn = config.storage.transactions.register(type, transaction, mutator)
      return removeListenerFn
    })

  const removeListeners: RemoveListenerFn[] = []

  return (reactotron: Reactotron) => {
    const log = ({ value, preview }: { value: unknown; preview: string }) => {
      reactotron.display({
        name: "MMKV",
        value,
        preview,
      })
    }

    return {
      onConnect() {
        const onWriteRemoveListeners = addListener("onwrite", (key, value) => {
          const keyIsIgnored = ignore.indexOf(key) !== -1
          if (keyIsIgnored) return

          const stringValue = JSON.stringify(value)
          const previewValue =
            stringValue.length > 50 ? stringValue.slice(0, 50) + "..." : stringValue

          log({
            value: { key, value },
            preview: `Set "${key}" to ${previewValue}`,
          })
        })

        const onDeleteRemoveListeners = addListener("ondelete", (key) => {
          const keyIsIgnored = ignore.indexOf(key) !== -1
          if (keyIsIgnored) return

          log({
            value: { key },
            preview: `Deleting "${key}"`,
          })
        })

        removeListeners.push(...onWriteRemoveListeners, ...onDeleteRemoveListeners)
      },
      onDisconnect() {
        removeListeners.forEach((removeListener) => {
          removeListener()
        })
      },
    }
  }
}
