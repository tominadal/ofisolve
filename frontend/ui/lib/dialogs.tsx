import React from "react";
import { toast } from "sonner";

export const confirmToast = (message: string): Promise<boolean> => {
  return new Promise((resolve) => {
    toast(message, {
      duration: 10000,
      onDismiss: () => resolve(false),
      onAutoClose: () => resolve(false),
      action: {
        label: "Confirmar",
        onClick: () => resolve(true),
      },
      cancel: {
        label: "Cancelar",
        onClick: () => resolve(false),
      },
    });
  });
};

export const promptToast = (message: string, defaultValue: string = ""): Promise<string | null> => {
  return new Promise((resolve) => {
    const id = toast.custom(
      (t) => (
        <div className="p-4 bg-background border border-border rounded-lg shadow-lg w-[356px] flex flex-col gap-3">
          <h3 className="font-medium text-sm">{message}</h3>
          <input
            id={`prompt-input-${t}`}
            type="text"
            defaultValue={defaultValue}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                toast.dismiss(t);
                resolve((e.target as HTMLInputElement).value);
              } else if (e.key === "Escape") {
                toast.dismiss(t);
                resolve(null);
              }
            }}
          />
          <div className="flex justify-end gap-2">
            <button
              className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-8 px-3"
              onClick={() => {
                toast.dismiss(t);
                resolve(null);
              }}
            >
              Cancelar
            </button>
            <button
              className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground shadow hover:bg-primary/90 h-8 px-3"
              onClick={() => {
                toast.dismiss(t);
                const val = (document.getElementById(`prompt-input-${t}`) as HTMLInputElement)?.value;
                resolve(val || "");
              }}
            >
              Aceptar
            </button>
          </div>
        </div>
      ),
      {
        duration: 100000,
        onDismiss: () => resolve(null),
        onAutoClose: () => resolve(null),
      }
    );
  });
};
