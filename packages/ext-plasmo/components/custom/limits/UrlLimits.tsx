import { AddButton } from "~/components/AddButton"
import { Dropdown } from "~/components/Dropdown"
import {
  ILimit,
  IUrlLimit,
  TLimitType,
  TUrlAndShortsPeriod
} from "~/types/limits.types"

interface Props {
  urlLimits: ILimit<IUrlLimit>[]
  handleCreateLimit: (type: TLimitType) => void
  handleUpdateLimit: (uuid: string, limit: IUrlLimit) => Promise<void>
  handleDeleteLimit: (uuid: string) => void
}

function UrlLimits({
  urlLimits,
  handleCreateLimit,
  handleUpdateLimit,
  handleDeleteLimit
}: Props) {
  const renderStorageUrls = () => {
    return urlLimits?.map((limit: ILimit<IUrlLimit>) => {
      return (
        <Dropdown
          type={"url"}
          key={limit.uuid}
          id={limit.uuid}
          period={limit.limit.period}
          time={`${limit.limit.time}`}
          timeUnit={limit.limit.timeUnit}
          onDelete={() => handleDeleteLimit(limit.uuid)}
          url={{
            autoFocus: !!urlLimits.find((limit) => !limit.limit.url),
            value: limit.limit.url,
            onChange: async (e) => {
              const element: HTMLInputElement = event.target as HTMLInputElement
              await handleUpdateLimit(limit.uuid, {
                ...limit.limit,
                url: element?.value
              })
            }
          }}
          updatePeriod={async (value: TUrlAndShortsPeriod) =>
            await handleUpdateLimit(limit.uuid, {
              ...limit.limit,
              period: value
            })
          }
          updateTime={async (value: string | null) =>
            !isNaN(+value) &&
            (await handleUpdateLimit(limit.uuid, {
              ...limit.limit,
              time: +value
            }))
          }
          updateTimeUnit={async (value: "minutes" | "hours") =>
            await handleUpdateLimit(limit.uuid, {
              ...limit.limit,
              timeUnit: value
            })
          }
        />
      )
    })
  }

  return (
    <section
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center"
      }}>
      {renderStorageUrls()}
      <AddButton onClick={() => handleCreateLimit("url")} />
    </section>
  )
}

export default UrlLimits
