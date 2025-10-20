import { axiosInstance } from "~/constants/axios.constants"

export interface iMakeRequestArgs {
  method:
    | "post"
    | "POST"
    | "get"
    | "GET"
    | "put"
    | "PUT"
    | "patch"
    | "PATCH"
    | "delete"
    | "DELETE"
  url: string
  data?: Record<string, any>
  headers?: Record<string, string>
}

async function makeRequest({
  method = "get",
  url = "",
  data,
  headers = {}
}: iMakeRequestArgs) {
  try {
    const updatedHeaders = {
      ...headers,
      "Access-Control-Allow-Origin": "propro.so"
    }
    const response = await (
      await axiosInstance()
    )({
      method,
      url,
      data,
      headers: updatedHeaders
    })
    // console.log("~ makeRequest - after request", response?.data)
    return response
  } catch (e) {
    if (method.toLocaleLowerCase() === "get") throw new Error(`${e}`)
  }
}

export default makeRequest
