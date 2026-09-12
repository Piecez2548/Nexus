import { Children, cloneElement, isValidElement, type ReactNode, type AriaAttributes } from "react";

type FieldChild = AriaAttributes & { id?: string; children?: ReactNode };

function describeField(children: ReactNode, id: string, errorId?: string): ReactNode {
  return Children.map(children, child => {
    if (!isValidElement<FieldChild>(child)) return child;
    if (child.props.id === id) {
      return cloneElement(child, {
        "aria-invalid": errorId ? true : child.props["aria-invalid"],
        "aria-describedby": [child.props["aria-describedby"], errorId].filter(Boolean).join(" ") || undefined,
      });
    }
    return child.props.children === undefined ? child : cloneElement(child, {}, describeField(child.props.children, id, errorId));
  });
}

interface Props {
  label: string;
  htmlFor: string;
  error?: string;
  children: ReactNode;
}

export default function FormField({ label, htmlFor, error, children }: Props) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1 block text-sm text-zinc-500 dark:text-zinc-400">
        {label}
      </label>

      {describeField(children, htmlFor, error ? `${htmlFor}-error` : undefined)}

      {error && (
        <p id={`${htmlFor}-error`} role="alert" className="mt-1 text-sm text-red-500">
          {error}
        </p>
      )}
    </div>
  );
}
