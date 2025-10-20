import type { PlasmoMessaging } from "@plasmohq/messaging";



import { iMakeRequestArgs } from "~/utils/api/makeRequest";





const handler: PlasmoMessaging.MessageHandler = async (req, res) => {
  const body = req?.body as iMakeRequestArgs
  console.log("BACKGROUND LOG -> ", { body })
  res.send({ success: true })
}

export default handler