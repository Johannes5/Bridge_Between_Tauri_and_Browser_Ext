import type { PlasmoMessaging } from "@plasmohq/messaging";





const handler: PlasmoMessaging.MessageHandler = async (req, res) => {
  try {
    const activeTab = await chrome.tabs.query({
      active: true,
      currentWindow: true
    })

    if (activeTab[0].id) await chrome.tabs.remove(activeTab[0].id)

    res.send({
      closed: !!activeTab?.[0]?.id
    })
  } catch (error) {
    res.send({
      closed: false
    })
  }
}

export default handler