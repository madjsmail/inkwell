interface TagChipProps {
  tag: string
}

export function TagChip({ tag }: TagChipProps) {
  return (
    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium bg-tag-bg text-tag-text">
      #{tag}
    </span>
  )
}
