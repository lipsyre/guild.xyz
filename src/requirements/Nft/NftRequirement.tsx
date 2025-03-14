import { Button } from "@/components/ui/Button"
import { consts } from "@guildxyz/types"
import { ImageData } from "@nouns/assets"
import { ArrowSquareOut } from "@phosphor-icons/react/dist/ssr"
import { BlockExplorerUrl } from "components/[guild]/Requirements/components/BlockExplorerUrl"
import {
  Requirement,
  RequirementProps,
} from "components/[guild]/Requirements/components/Requirement"
import { useRequirementContext } from "components/[guild]/Requirements/components/RequirementContext"
import useGuild from "components/[guild]/hooks/useGuild"
import { DataBlock } from "components/common/DataBlock"
import { env } from "env"
import { Fragment } from "react"
import { SearchableListDialog } from "requirements/common/SearchableListDialog"
import useSWRImmutable from "swr/immutable"
import { Trait } from "types"
import { isGuildPinSupportedChain } from "utils/guildCheckout/utils"
import shortenHex from "utils/shortenHex"
import { Chain } from "wagmiConfig/chains"
import useNftMetadata, {
  NOUNS_BACKGROUNDS,
  useNftMetadataWithTraits,
} from "./hooks/useNftMetadata"

const imageDataTypeMap = {
  body: "bodies",
  accessory: "accessories",
  head: "heads",
  glasses: "glasses",
}

const getNounsRequirementType = (trait: Trait) =>
  !trait
    ? undefined
    : trait.trait_type === "background"
      ? NOUNS_BACKGROUNDS?.[trait.value]
      : ImageData.images?.[imageDataTypeMap[trait.trait_type]]?.[+trait.value]
          ?.filename

const NftRequirement = (props: RequirementProps) => {
  const requirement = useRequirementContext()

  // TODO: we could remove the cast once we'll have schemas for "ERC..." requirements
  const requirementChain = requirement.chain as Chain
  const requirementAddress = requirement.address as `0x${string}`

  // This is a really basic solution, and it'll only handle the "Joined Guild" NFTs. We should probably think about a better solution in the future.
  const isGuildPin =
    isGuildPinSupportedChain(requirementChain) &&
    consts.PinContractAddresses[requirementChain] ===
      requirementAddress.toLowerCase()

  const guildIdAttribute =
    isGuildPin &&
    requirement.data?.attributes?.find((attr) => attr.trait_type === "guildId")
      ?.value
  const { data: guildPinImageCID } = useSWRImmutable(
    isGuildPin
      ? // Fallback to "Our Guild" pin image
        `/v2/guilds/${guildIdAttribute ?? 1985}/pin?guildAction=0`
      : null
  )
  const { name: guildPinGuildName } = useGuild(guildIdAttribute ?? "")

  const { metadata: metadataWithTraits, isLoading: isMetadataWithTraitsLoading } =
    useNftMetadata(requirementChain, requirementAddress, requirement.data?.id)
  const { metadata, isLoading } = useNftMetadataWithTraits(
    requirementChain,
    requirementAddress
  )

  const nftDataLoading = isLoading || isMetadataWithTraitsLoading
  const nftName = isGuildPin ? (
    <>
      {guildPinGuildName && (
        <>
          <DataBlock>{guildPinGuildName}</DataBlock>
        </>
      )}
      <span>{" Guild Pin"}</span>
    </>
  ) : (
    metadataWithTraits?.name || metadata?.name
  )
  const nftImage = guildPinImageCID
    ? `${env.NEXT_PUBLIC_IPFS_GATEWAY}${guildPinImageCID}`
    : metadataWithTraits?.image || metadata?.image

  const shouldRenderImage =
    ["ETHEREUM", "POLYGON"].includes(requirementChain) &&
    (nftName || (requirement.name && requirement.name !== "-")) &&
    (nftDataLoading || nftImage)

  return (
    <Requirement
      image={
        shouldRenderImage ? nftImage : <span className="font-bold text-xs">NFT</span>
      }
      isImageLoading={nftDataLoading}
      footer={<BlockExplorerUrl />}
      {...props}
    >
      {"Own "}
      {requirement.data?.id
        ? requirement.type === "ERC1155"
          ? "a(n) "
          : "the "
        : requirement.data?.ids?.length > 0
          ? "a(n) "
          : requirement.data?.maxAmount > 0
            ? `${requirement.data?.minAmount}-${requirement.data?.maxAmount} `
            : requirement.data?.minAmount > 1
              ? `at least ${requirement.data?.minAmount} `
              : "a(n) "}

      {nftName ||
        (!requirement.name || requirement.name === "-"
          ? (metadata?.slug ?? (
              <DataBlock>{shortenHex(requirementAddress, 3)}</DataBlock>
            ))
          : requirement.name !== "-" && requirement.name)}

      {requirement.data?.attributes?.length ? (
        <>
          {isGuildPin &&
          requirement.data.attributes.length <= 1 &&
          requirement.data.attributes.find((attr) => attr.trait_type === "guildId")
            ? ""
            : " with "}
          {requirement.data.attributes.map((trait, index) => {
            if (isGuildPin && trait.trait_type === "guildId") return null
            const attributeValue =
              requirement.type === "NOUNS"
                ? getNounsRequirementType(trait)
                : trait.value
            return (
              <Fragment key={`${trait.trait_type}-${trait.value}`}>
                {attributeValue
                  ? `${attributeValue} ${trait.trait_type}${
                      index < requirement.data.attributes.length - 1 ? ", " : ""
                    }`
                  : trait.minValue && trait.maxValue
                    ? `${trait.minValue}-${trait.maxValue} ${trait.trait_type}`
                    : trait.minValue
                      ? `at least ${trait.minValue} ${trait.trait_type}`
                      : trait.maxValue
                        ? `at most ${trait.maxValue} ${trait.trait_type}`
                        : ""}
              </Fragment>
            )
          })}
        </>
      ) : (
        ` NFT${
          requirement.data?.maxAmount > 0 || requirement.data?.minAmount > 1
            ? "s"
            : ""
        }`
      )}
      {requirement.data?.id ? (
        <>
          {" "}
          with id <DataBlock>{requirement.data?.id}</DataBlock>
        </>
      ) : requirement.data?.ids?.length > 0 ? (
        <>
          {` with a `}
          <SearchableListDialog
            initialList={requirement.data?.ids}
            title="Token IDs"
            trigger={
              <Button
                variant="unstyled"
                className="h-auto p-0 underline-offset-2 hover:underline"
                rightIcon={<ArrowSquareOut weight="bold" />}
              >
                specific ID
              </Button>
            }
          />
        </>
      ) : null}
    </Requirement>
  )
}

export default NftRequirement
