"use client";

import { useActionState, useEffect, useMemo, useState, useTransition } from "react";
import { CalendarDays, Check, ChevronLeft, ChevronRight, Clock, Loader2, Scissors } from "lucide-react";

import { createBookingAction } from "@/lib/actions/booking";
import { fetchAvailabilityAction } from "@/lib/actions/availability";
import { idleState } from "@/lib/actions/types";
import type { DayAvailability } from "@/lib/data";
import { formatDuration, formatPrice } from "@/lib/utils";
import { addDaysToKey, formatClock, formatDayLabel, formatShortDay, todayKey } from "@/lib/time";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/submit-button";
import { TextAreaField, TextField } from "@/components/ui/field";
import { FormAlert } from "@/components/form-alert";

type Service = {
  id: string;
  name: string;
  description: string;
  durationMin: number;
  priceMillimes: number;
};

const DAYS_PER_PAGE = 7;

export function BookingWizard({
  services,
  prefill,
  initialServiceId,
}: {
  services: Service[];
  prefill?: { name: string; phone: string };
  initialServiceId?: string;
}) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [serviceId, setServiceId] = useState<string>(initialServiceId ?? services[0]?.id ?? "");
  const [pageStart, setPageStart] = useState<string>(todayKey());
  const [availability, setAvailability] = useState<DayAvailability[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, startLoading] = useTransition();
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [selectedMinutes, setSelectedMinutes] = useState<number | null>(null);

  const service = services.find((s) => s.id === serviceId) ?? null;

  useEffect(() => {
    if (!serviceId) return;
    startLoading(async () => {
      // Efface l'erreur précédente au tout début du chargement plutôt que
      // dans le corps de l'effet : évite un `setState` synchrone directement
      // dans l'effet, sans changer le moment où l'utilisateur voit l'écran
      // se réinitialiser (aucun `await` avant cette ligne).
      setLoadError(null);
      const result = await fetchAvailabilityAction(serviceId, pageStart, DAYS_PER_PAGE);
      if (result.ok) {
        setAvailability(result.availability);
      } else {
        setLoadError(result.error);
        setAvailability([]);
      }
    });
  }, [serviceId, pageStart]);

  const selectedDayInfo = useMemo(
    () => availability.find((d) => d.day === selectedDay) ?? null,
    [availability, selectedDay],
  );

  const [formState, formAction] = useActionState(createBookingAction, idleState);

  // Le code renvoyé après succès reste affiché : c'est la seule trace que le
  // client garde de sa réservation en tant qu'invité.
  if (formState.status === "success" && formState.data?.reference) {
    return <BookingConfirmation reference={formState.data.reference} />;
  }

  return (
    <div className="rise-in">
      <Steps current={step} />

      {step === 1 && (
        <div className="mt-8">
          <h2 className="font-display text-2xl font-semibold">Choisissez une prestation</h2>
          {services.length === 0 ? (
            <p className="mt-4 text-stone">Aucune prestation n&apos;est disponible pour le moment.</p>
          ) : (
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {services.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    setServiceId(s.id);
                    setSelectedDay(null);
                    setSelectedMinutes(null);
                  }}
                  className={cn(
                    "flex cursor-pointer items-start gap-3 rounded-sm border p-4 text-left transition-colors",
                    s.id === serviceId
                      ? "border-brass bg-charcoal-raised"
                      : "border-stone/30 hover:border-brass-soft",
                  )}
                  aria-pressed={s.id === serviceId}
                >
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-charcoal">
                    <Scissors size={16} className="text-brass" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="font-medium">{s.name}</span>
                      <span className="whitespace-nowrap font-display text-brass">
                        {formatPrice(s.priceMillimes)}
                      </span>
                    </span>
                    <span className="mt-1 flex items-center gap-1.5 text-sm text-stone">
                      <Clock size={12} aria-hidden="true" />
                      {formatDuration(s.durationMin)}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          )}
          <div className="mt-8 flex justify-end">
            <Button type="button" disabled={!service} onClick={() => setStep(2)}>
              Continuer
            </Button>
          </div>
        </div>
      )}

      {step === 2 && service && (
        <div className="mt-8">
          <h2 className="font-display text-2xl font-semibold">Choisissez un créneau</h2>
          <p className="mt-1 text-sm text-stone">
            {service.name} · {formatDuration(service.durationMin)}
          </p>

          <div className="mt-6 flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const prev = addDaysToKey(pageStart, -DAYS_PER_PAGE);
                setPageStart(prev < todayKey() ? todayKey() : prev);
              }}
              disabled={pageStart <= todayKey()}
              aria-label="Semaine précédente"
              className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-sm border border-stone/30 text-stone transition-colors hover:border-brass hover:text-brass disabled:cursor-not-allowed disabled:opacity-30"
            >
              <ChevronLeft size={18} aria-hidden="true" />
            </button>

            <div className="scroll-x flex flex-1 gap-2">
              {availability.map((d) => (
                <button
                  key={d.day}
                  type="button"
                  disabled={!d.isOpen}
                  onClick={() => {
                    setSelectedDay(d.day);
                    setSelectedMinutes(null);
                  }}
                  className={cn(
                    "flex min-w-[4.5rem] shrink-0 flex-col items-center gap-0.5 rounded-sm border px-3 py-2.5 text-sm transition-colors",
                    !d.isOpen && "cursor-not-allowed border-stone/10 text-stone/40",
                    d.isOpen && d.day === selectedDay && "border-brass bg-charcoal-raised text-ivory",
                    d.isOpen && d.day !== selectedDay && "cursor-pointer border-stone/30 text-ivory hover:border-brass-soft",
                  )}
                  aria-pressed={d.day === selectedDay}
                >
                  <span className="text-xs uppercase text-stone">{formatShortDay(d.day).split(" ")[0]}</span>
                  <span className="font-display font-semibold">{formatShortDay(d.day).split(" ")[1]}</span>
                  {d.isOpen && (
                    <span className="text-[10px] text-stone">{d.freeCount} lib.</span>
                  )}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setPageStart(addDaysToKey(pageStart, DAYS_PER_PAGE))}
              aria-label="Semaine suivante"
              className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-sm border border-stone/30 text-stone transition-colors hover:border-brass hover:text-brass"
            >
              <ChevronRight size={18} aria-hidden="true" />
            </button>
          </div>

          <div className="mt-6 min-h-[7rem]">
            {isLoading && (
              <p className="flex items-center gap-2 text-sm text-stone">
                <Loader2 size={14} className="animate-spin" aria-hidden="true" />
                Chargement des disponibilités…
              </p>
            )}
            {loadError && <p className="text-sm text-danger">{loadError}</p>}
            {!isLoading && !loadError && selectedDay && selectedDayInfo && (
              <>
                <p className="mb-3 flex items-center gap-1.5 text-sm text-stone">
                  <CalendarDays size={14} aria-hidden="true" />
                  {formatDayLabel(selectedDay)}
                </p>
                {selectedDayInfo.slots.filter((s) => s.available).length === 0 ? (
                  <p className="text-sm text-stone">Plus aucun créneau disponible ce jour-là.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {selectedDayInfo.slots.map((slot) => (
                      <button
                        key={slot.minutes}
                        type="button"
                        disabled={!slot.available}
                        onClick={() => setSelectedMinutes(slot.minutes)}
                        className={cn(
                          "min-w-16 cursor-pointer rounded-sm border px-3 py-2 text-sm transition-colors",
                          !slot.available && "cursor-not-allowed border-stone/10 text-stone/30 line-through",
                          slot.available && slot.minutes === selectedMinutes && "border-brass bg-brass text-charcoal",
                          slot.available && slot.minutes !== selectedMinutes && "border-stone/30 text-ivory hover:border-brass-soft",
                        )}
                        aria-pressed={slot.minutes === selectedMinutes}
                      >
                        {slot.label}
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
            {!isLoading && !loadError && !selectedDay && (
              <p className="text-sm text-stone">Choisissez une date pour voir les horaires disponibles.</p>
            )}
          </div>

          <div className="mt-8 flex justify-between">
            <Button type="button" variant="outline" onClick={() => setStep(1)}>
              Retour
            </Button>
            <Button
              type="button"
              disabled={selectedMinutes === null}
              onClick={() => setStep(3)}
            >
              Continuer
            </Button>
          </div>
        </div>
      )}

      {step === 3 && service && selectedDay && selectedMinutes !== null && (
        <div className="mt-8">
          <h2 className="font-display text-2xl font-semibold">Vos coordonnées</h2>
          <div className="mt-4 rounded-sm border border-brass-soft/30 bg-charcoal-raised p-4 text-sm">
            <p className="font-medium">{service.name}</p>
            <p className="mt-1 text-stone">
              {formatDayLabel(selectedDay)} à {formatClock(selectedMinutes)} ·{" "}
              {formatPrice(service.priceMillimes)}
            </p>
          </div>

          <form action={formAction} className="mt-6 flex flex-col gap-4">
            <input type="hidden" name="serviceId" value={service.id} />
            <input type="hidden" name="day" value={selectedDay} />
            <input type="hidden" name="minutes" value={selectedMinutes} />

            <TextField
              label="Nom complet"
              name="contactName"
              autoComplete="name"
              defaultValue={prefill?.name}
              error={formState.errors?.contactName}
              required
            />
            <TextField
              label="Téléphone"
              name="contactPhone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="50 882 529"
              defaultValue={prefill?.phone}
              error={formState.errors?.contactPhone}
              required
            />
            <TextAreaField
              label="Note pour le coiffeur (facultatif)"
              name="notes"
              placeholder="Précisions sur la coupe souhaitée…"
              error={formState.errors?.notes}
            />

            <FormAlert state={formState} />

            <div className="mt-2 flex justify-between">
              <Button type="button" variant="outline" onClick={() => setStep(2)}>
                Retour
              </Button>
              <SubmitButton>
                <Check size={16} aria-hidden="true" />
                Confirmer la réservation
              </SubmitButton>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function Steps({ current }: { current: 1 | 2 | 3 }) {
  const labels = ["Prestation", "Créneau", "Coordonnées"];
  return (
    <ol className="flex items-center gap-2 text-xs text-stone" aria-label="Étapes de réservation">
      {labels.map((label, i) => {
        const n = (i + 1) as 1 | 2 | 3;
        return (
          <li key={label} className="flex items-center gap-2">
            <span
              className={cn(
                "flex h-6 w-6 items-center justify-center rounded-full border text-[11px]",
                n === current
                  ? "border-brass bg-brass text-charcoal"
                  : n < current
                    ? "border-brass text-brass"
                    : "border-stone/40 text-stone",
              )}
              aria-current={n === current ? "step" : undefined}
            >
              {n < current ? <Check size={12} aria-hidden="true" /> : n}
            </span>
            <span className={n === current ? "text-ivory" : ""}>{label}</span>
            {i < labels.length - 1 && <span className="mx-1 h-px w-6 bg-stone/30" aria-hidden="true" />}
          </li>
        );
      })}
    </ol>
  );
}

function BookingConfirmation({ reference }: { reference: string }) {
  return (
    <div className="rise-in mt-8 flex flex-col items-center rounded-sm border border-brass-soft/30 bg-charcoal-raised p-10 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-success-bg">
        <Check size={26} className="text-success" aria-hidden="true" />
      </span>
      <h2 className="mt-4 font-display text-2xl font-semibold">Demande enregistrée</h2>
      <p className="mt-2 max-w-sm text-stone">
        Le salon confirmera votre rendez-vous prochainement. Vous pourrez le suivre ou l&apos;annuler
        à tout moment avec votre numéro de téléphone.
      </p>
      <p className="mt-4 text-xs text-stone">
        Référence : <span className="font-medium text-ivory">{reference}</span>
      </p>
      <a
        href="/ma-reservation"
        className="mt-6 rounded-sm border border-stone/40 px-5 py-2.5 text-sm font-medium text-ivory transition-colors hover:border-brass hover:text-brass"
      >
        Suivre ma réservation
      </a>
    </div>
  );
}

