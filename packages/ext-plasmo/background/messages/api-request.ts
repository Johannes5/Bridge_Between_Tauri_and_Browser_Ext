import type { PlasmoMessaging } from "@plasmohq/messaging";



import makeRequest, { iMakeRequestArgs } from "~/utils/api/makeRequest"





const handler: PlasmoMessaging.MessageHandler = async (req, res) => {
  const body = req?.body as iMakeRequestArgs
  try {
    const response = await makeRequest({
      url: body?.url,
      method: body?.method,
      data: body?.data,
      headers: body?.headers
    })
    console.log("API RESPONSE", req?.body?.url, response?.data)
    res.send(response?.data)
  } catch (e) {
    console.log("API REQUEST ERROR", req?.body?.url, e)
    res.send({ success: false, message: `${e}`, error: e })
  }
}

export default handler