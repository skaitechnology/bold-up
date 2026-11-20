"use client";

import { Camera, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { CoachPortrait } from "@/components/coach/coach-portrait";
import { toast } from "@/components/ui/toast";
import { savePhotoAction } from "@/lib/actions/pro";
import { PHOTO_MAX_BYTES } from "@/lib/domain";
import { useI18n } from "@/lib/i18n/client";
import { createClient } from "@/lib/supabase/client";

/** Scales the picture down in the browser so uploads stay light on mobile networks. */
async function toJpeg(file: File, maxSide = 1600): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("canvas");
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve, reject) => canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("encode"))), "image/jpeg", 0.86));
}

/** Profile photo: straight from the browser to the coach's own folder, then saved on the profile. */
export function PhotoUploader({ userId, photoPath, name }: { userId: string; photoPath: string | null; name: string }) {
  const { t } = useI18n();
  const p = t.pro.profile;
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > PHOTO_MAX_BYTES * 3) {
      toast.error(p.photoInvalid);
      return;
    }
    setBusy(true);
    try {
      const blob = await toJpeg(file);
      if (blob.size > PHOTO_MAX_BYTES) throw new Error("too large");
      const path = `${userId}/portrait-${Date.now()}.jpg`;
      const { error } = await createClient().storage.from("coach-media").upload(path, blob, { contentType: "image/jpeg", cacheControl: "31536000" });
      if (error) throw error;
      const result = await savePhotoAction(path);
      if (!result.ok) throw new Error(result.error);
      toast.success(p.photoSaved);
      router.refresh();
    } catch {
      toast.error(t.common.errors.upload_failed);
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="flex items-center gap-5">
      <div className="relative h-[132px] w-[106px] shrink-0 overflow-hidden rounded-[22px] bg-sand2" data-testid="photo-preview" data-has-photo={photoPath ? "true" : "false"}>
        <CoachPortrait photoPath={photoPath} name={name || "·"} eager />
        {busy ? (
          <div className="absolute inset-0 flex items-center justify-center bg-ink/55 text-paper">
            <LoaderCircle size={22} className="animate-spin" aria-hidden />
          </div>
        ) : null}
      </div>
      <div className="min-w-0">
        <p className="text-[13px] font-semibold text-ink">{p.photo}</p>
        <p className="mt-1 max-w-xs text-[13px] leading-snug text-muted">{p.photoHint}</p>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          id="photo-input"
          onChange={(event) => onFile(event.target.files?.[0])}
          data-testid="photo-input"
        />
        <label
          htmlFor="photo-input"
          className="press mt-3 inline-flex h-10 cursor-pointer items-center gap-2 rounded-full border border-line2 bg-paper px-4 text-[13.5px] font-semibold text-ink hover:border-ink"
        >
          <Camera size={16} aria-hidden />
          {photoPath ? p.photoChange : p.photoAdd}
        </label>
      </div>
    </div>
  );
}
