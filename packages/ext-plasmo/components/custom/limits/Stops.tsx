import { AddButton } from "~/components/AddButton"
import { Dropdown } from "~/components/Dropdown"
import {
  ILimit,
  IStopsLimit,
  TLimitType,
  TStopsTimeUnit
} from "~/types/limits.types"

interface Props {
  stops: ILimit<IStopsLimit>[]
  handleCreateLimit: (type: TLimitType) => void
  handleUpdateLimit: (uuid: string, limit: IStopsLimit) => Promise<void>
  handleDeleteLimit: (uuid: string) => void
}
export default function Stops({
  stops,
  handleCreateLimit,
  handleUpdateLimit,
  handleDeleteLimit
}: Props) {
  return (
    <div className="flex flex-col items-center justify-center">
      {stops?.length <= 0 && (
        <div className="text-white">
          No stop has been created, click the plus button below to create one.
        </div>
      )}
      {stops.map((stop, i) => (
        <Dropdown
          type="stops"
          key={`${i}-${stop?.uuid}`}
          id={`${i}-${stop?.uuid}`}
          url={{
            autoFocus: i === stops.length - 1 && !stop.limit.url,
            value: stop?.limit.url,
            onChange: async (e: React.ChangeEvent<HTMLInputElement>) =>
              await handleUpdateLimit(stop.uuid, {
                ...stop.limit,
                url: e?.target?.value
              })
          }}
          time={`${stop.limit.time}`}
          updateTime={async (val) =>
            await handleUpdateLimit(stop.uuid, {
              ...stop.limit,
              time: Number(val)
            })
          }
          onDelete={() => handleDeleteLimit(stop.uuid)}
          period={stop?.limit.selectedTimeUnit}
          updatePeriod={async (val: string) =>
            val &&
            (await handleUpdateLimit(stop.uuid, {
              ...stop.limit,
              selectedTimeUnit: val as TStopsTimeUnit
            }))
          }
        />
      ))}
      <div className="flex justify-center">
        <AddButton onClick={() => handleCreateLimit("stops")} />
      </div>
    </div>
  )
}
