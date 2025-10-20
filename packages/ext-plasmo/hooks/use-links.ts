import { DragEndEvent } from "@dnd-kit/core"
import { arrayMove } from "@dnd-kit/sortable"
import { useEffect, useState } from "react"

import { defaultLinks } from "~/constants/defaults.constants"
import { ILink } from "~/types/links.types"
import { generateUUID } from "~/utils/index.utils"
import { $storage } from "~/utils/storage/index.utils"

export default function useLinks() {
  const [settingLinks, settingLinksSetter] = useState(true)
  const [links, setLinks] = useState<ILink[]>([])
  const [newLink, setNewLink] = useState<ILink>({
    uuid: "",
    name: "",
    url: ""
  })

  const [customisingLinks, setCustomisingLinks] = useState(false)
  const [showAddLinkForm, setShowAddLinkForm] = useState(false)

  /**
   * Sets links on chrome local storage and state.
   * @param links | Link[] | array of links.
   * @param storage | boolean | whether or not the links should be saved to chrome storage or not.
   */
  async function linksSuperSetter(links: ILink[], storage = true) {
    if (!Array.isArray(links)) return

    setLinks([...links])

    if (!storage) return
    await $storage.links.set(links)
  }

  /**
   * function to get links from chrome local storage and set to state. If there's no link set, it sets the default links.
   */
  async function setLinksToState() {
    const linksInStorage = await $storage.links.get()
    if (!linksInStorage) {
      const linksToSet = (defaultLinks || []).reverse()
      linksSuperSetter(linksToSet)
      return settingLinksSetter(false)
    }
    linksSuperSetter(linksInStorage, false)
    settingLinksSetter(false)
  }

  /**
   * Updates a single link
   * @param uuid | string | represents the uuid of the link to be updated.
   * @param name | string | represents the name of the new link
   * @param link | string | represents the url of the new link
   */
  async function updateLink(uuid: string, name: string, url: string) {
    let newLinks: ILink[] = [...links]
    if (url === "" && name === "") return await deleteLink(uuid)

    newLinks = newLinks.map((item) => {
      if (uuid === item.uuid)
        return {
          ...item,
          name,
          url
        }

      return item
    })
    linksSuperSetter(newLinks)
  }

  /**
   * Deletes a single link.
   * @param uuid | string | represents the uuid of the link to be deleted.
   */
  async function deleteLink(uuid: string) {
    let newLinks = [...links]
    newLinks = newLinks.filter((item) => item.uuid !== uuid)
    linksSuperSetter(newLinks)
  }

  async function addNewLink() {
    if (!newLink.name.trim() || !newLink.url.trim())
      return alert("You can't create a link with empty name or empty link.")

    const newLinkObj: ILink = {
      uuid: generateUUID(),
      name: newLink.name.trim(),
      url: newLink.url.trim()
    }
    const allLinks = [newLinkObj, ...links]
    setNewLink({
      uuid: "",
      name: "",
      url: ""
    })
    linksSuperSetter(allLinks)
  }

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e
    if (active?.id === over?.id) return
    const oldIndex = links.findIndex((link) => link.uuid === active.id)
    const newIndex = links.findIndex((link) => link.uuid === over?.id)
    setLinks(arrayMove(links, oldIndex, newIndex))
  }
  useEffect(() => {
    setLinksToState()
  }, [])

  return {
    links,
    setLinks,
    updateLink,
    deleteLink,
    settingLinks,
    newLink,
    setNewLink,
    addNewLink,
    customisingLinks,
    setCustomisingLinks,
    showAddLinkForm,
    setShowAddLinkForm,
    onDragEnd
  }
}
