// [분자] Toast = 팝업 레시피 + Dot + IconButton
import { Toast as BaseToast } from "@base-ui/react/toast";
import { cn } from "@/lib/cn";
import { POPUP } from "@/ui/0-tokens/recipes";
import { type Tone } from "@/ui/0-tokens/tone";
import { Dot } from "@/ui/1-atoms/dot";
import { IconButton } from "@/ui/2-molecules/icon-button";

/** [분자] Toast = 팝업 레시피 + Dot(유형) + 제목·설명 + IconButton(close). 우하단. `useToast().add({ title, description, type })`. */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  return (
    <BaseToast.Provider>
      {children}
      <BaseToast.Portal>
        <BaseToast.Viewport className="fixed bottom-6 end-6 z-[60] flex w-[360px] flex-col gap-3 outline-none"><ToastList /></BaseToast.Viewport>
      </BaseToast.Portal>
    </BaseToast.Provider>
  );
}

const TOAST_TONE: Record<string, Tone> = { success: "running", error: "failed", warning: "progress" };

function ToastList() {
  const { toasts } = BaseToast.useToastManager();
  return toasts.map((t) => (
    <BaseToast.Root key={t.id} toast={t} className={cn("flex items-start gap-3 p-4 enter-slide", POPUP)}>
      <Dot tone={TOAST_TONE[t.type ?? ""] ?? "info"} pulse={false} className="mt-2" />
      <BaseToast.Content className="min-w-0 flex-1">
        <BaseToast.Title className="text-body font-medium text-text" />
        <BaseToast.Description className="mt-0.5 text-body text-mute" />
      </BaseToast.Content>
      <BaseToast.Close render={<IconButton size="sm" label="닫기" icon="close" className="-me-1 -mt-1" />} />
    </BaseToast.Root>
  ));
}

export const useToast = BaseToast.useToastManager;
