import "react";

declare module "react" {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      "model-viewer": React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        src?: string; alt?: string; "camera-controls"?: boolean; "auto-rotate"?: boolean; "shadow-intensity"?: string;
      };
    }
  }
}
