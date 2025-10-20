import { HTMLElementRefOf } from "@plasmicapp/react-web"
import * as React from "react"

import {
  DefaultQuoteItemProps,
  PlasmicQuoteItem
} from "./plasmic/short_stop/PlasmicQuoteItem"

export interface QuoteItemProps
  extends Omit<DefaultQuoteItemProps, "calculateRows"> {
  saveNewQuotes?: () => void
  calculateRows: (
    e:
      | React.MouseEvent<HTMLTextAreaElement, MouseEvent>
      | React.ChangeEvent<HTMLTextAreaElement>
  ) => number
}

function QuoteItem_(
  { saveNewQuotes, ...props }: QuoteItemProps,
  ref: HTMLElementRefOf<"div">
) {
  const [rows, setRows] = React.useState(
    Math.ceil(
      (props?.textareaValue2?.length || 44) /
        44 /*44, because there is an average of 44 xters per line in the textarea*/
    )
  ) // this is needed because we need the height of the textarea to be exactly as much as it needs to be to house the quote.

  return (
    <PlasmicQuoteItem
      rows={rows}
      textarea={{
        onChange: (e: any) => {
          !props?.isEditing &&
            props?.calculateRows &&
            setRows(props?.calculateRows(e)!)
        },
        onMouseOver: (e: any) =>
          !props?.isEditing &&
          props?.calculateRows &&
          setRows(props?.calculateRows(e)!),
        onLoad: (e: any) =>
          !props?.isEditing &&
          props?.calculateRows &&
          setRows(props?.calculateRows(e)!),
        onKeyDown: (e) => {
          if (e?.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            return saveNewQuotes && saveNewQuotes()
          }
        },
        autoFocus: true,
        style: {
          backgroundColor: "transparent",
          height: "100%",
          padding: "10px"
        }
      }}
      quoteTextContainer={{
        style: {
          height: "100%"
        }
      }}
      quoteItem={{
        style: {
          flex: 1
        }
      }}
      root={{ ref }}
      {...props}
    />
  )
}

const QuoteItem = React.forwardRef(QuoteItem_)
export default QuoteItem
