import { HTMLElementRefOf } from "@plasmicapp/react-web"
import * as React from "react"

import {
  DefaultQuoteProps,
  PlasmicQuote
} from "./plasmic/short_stop/PlasmicQuote"

export interface QuoteProps extends Omit<DefaultQuoteProps, "calculateRows"> {
  calculateRows: (
    e:
      | React.MouseEvent<HTMLTextAreaElement, MouseEvent>
      | React.ChangeEvent<HTMLTextAreaElement>
  ) => number
}

function Quote_(props: QuoteProps, ref: HTMLElementRefOf<"div">) {
  const [rows, setRows] = React.useState(1)

  return (
    <PlasmicQuote
      root={{ ref }}
      rows={rows}
      {...props}
      quoteTextArea={{
        onClick: (e) =>
          props?.calculateRows && setRows(props?.calculateRows(e)!),

        onChange: (e) =>
          props?.calculateRows && setRows(props?.calculateRows(e)!),

        onMouseOver: (e) =>
          props?.calculateRows && setRows(props?.calculateRows(e)!)
      }}
    />
  )
}

const Quote = React.forwardRef(Quote_)
export default Quote
