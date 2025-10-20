import { AddButton } from "~/components/AddButton";
import { Dropdown } from "~/components/Dropdown";
import { URL_AND_SHORTS_PERIODS } from "~/constants/options.constants";
import { ILimit, IShortsLimit, TLimitType, TUrlAndShortsPeriod } from "~/types/limits.types";





interface Props {
  shortsLimits: ILimit<IShortsLimit>[]
  handleCreateLimit: (type: TLimitType) => void
  handleUpdateLimit: (uuid: string, limit: IShortsLimit) => Promise<void>
  handleDeleteLimit: (uuid: string) => void
}

function ShortsLimits({
  shortsLimits,
  handleCreateLimit,
  handleUpdateLimit,
  handleDeleteLimit
}: Props) {
  // console.log("SHORTS LIMITS", shortsLimits)

  const availablePeriodOptions = URL_AND_SHORTS_PERIODS.filter(
    (period) =>
      !shortsLimits.some((limit) => limit.limit.period === period.value)
  )

  const renderShorts = () => {
    return shortsLimits?.map((item: ILimit<IShortsLimit>) => {
      return (
        <Dropdown
          onDelete={() => handleDeleteLimit(item.uuid)}
          type={"shorts"}
          key={item?.uuid}
          id={item?.uuid}
          period={item.limit?.period}
          availablePeriodOptions={availablePeriodOptions}
          time={String(item.limit?.watchedShortsLimit)}
          updatePeriod={async (value: TUrlAndShortsPeriod | null) =>
            value &&
            (await handleUpdateLimit(item.uuid, {
              ...item.limit,
              period: value
            }))
          }
          updateTime={async (value: string | null) => {
            // console.log("UPDATE TIME", value)
            value &&
              !isNaN(+value) &&
              (await handleUpdateLimit(item.uuid, {
                ...item.limit,
                watchedShortsLimit: +value
              }))
          }}
        />
      )
    })
  }

  return (
    <div className="flex flex-col items-center justify-center">
      {renderShorts()}
      {!!availablePeriodOptions?.length && (
        <AddButton onClick={() => handleCreateLimit("shorts")} />
      )}
    </div>
  )
}

export default ShortsLimits