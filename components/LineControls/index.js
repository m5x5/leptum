import { IMPACT_TYPES } from "../../utils";

export default function LineControls({ onChange = () => {}, selected = [] }) {
  const onClick = (item) => {
    const index = selected.indexOf(item);

    if (index < 0) {
      selected.push(item);
    } else {
      selected.splice(index, 1);
    }

    // Sort selected by position in impact types
    selected = selected.sort((a, b) => {
      const aIndex = IMPACT_TYPES.indexOf(a.type);
      const bIndex = IMPACT_TYPES.indexOf(b.type);
      return aIndex - bIndex;
    });

    onChange(selected);
  };

  const getClasses = (type) => {
    const isSelected = selected.includes(type);
    let classes =
      "w-100 text-gray-300 p-2 cursor-pointer rounded-lg bg-gray-800 ";

    if (isSelected) {
      classes += "border-2 border-gray-600";
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
