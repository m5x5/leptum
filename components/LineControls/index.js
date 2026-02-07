import { IMPACT_TYPES } from "../../utils";

export default function LineControls({ onChange = () => {}, selected = [] }) {
  const onClick = (item) => {
    const index = selected.indexOf(item);
    const next = index < 0
      ? [...selected, item]
      : selected.slice(0, index).concat(selected.slice(index + 1));

    // Sort selected by position in impact types
    const sorted = [...next].sort((a, b) => {
      const aIndex = IMPACT_TYPES.indexOf(a.type);
      const bIndex = IMPACT_TYPES.indexOf(b.type);
      return aIndex - bIndex;
    });

    onChange(sorted);
  };

  const getClasses = (type) => {
    const isSelected = selected.includes(type);
    let classes =
      "w-100 text-foreground p-2 cursor-pointer rounded-lg bg-card border border-border ";

    if (isSelected) {
      classes += "border-2 border-primary";
    }

    return classes;
  };

  return (
    <div className="flex row items-center justify-start max-w-full gap-2 flex-wrap">
      {IMPACT_TYPES.map((type, index) => {
        return (
          <div
            className={getClasses(type)}
            key={index}
            onClick={() => onClick(type)}
          >
            {type}
          </div>
        );
      })}
    </div>
  );
}
