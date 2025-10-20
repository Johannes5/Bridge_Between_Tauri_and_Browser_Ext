import { LINKS_STORAGE_KEY } from "~/constants/storage.constants"
import { ILink } from "~/types/links.types"
import { plasmoStorage } from "~/utils/storage/index.utils"

export async function getLinks(): Promise<ILink[] | null> {
  const links = await plasmoStorage.get(LINKS_STORAGE_KEY, null)
  return links
}

export async function setLinks(links: ILink[]) {
  await plasmoStorage.set(LINKS_STORAGE_KEY, links)
}
