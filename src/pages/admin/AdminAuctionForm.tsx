import {
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  Image as ImageIcon,
  Info,
  Layers3,
  Save,
  Sparkles,
  Ticket,
  Wand2,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useToast } from '../../components/Toast'
import { AlertBox, Badge, Button, Card, Field, Input, Select, Textarea, cn } from '../../components/ui'
import { formatETB, fromLocalInputValue, toLocalInputValue } from '../../lib/format'
import { useAuction, useStore } from '../../store/useStore'
import { AdminPageHeader } from './components'

interface FormState {
  title: string
  titleAm: string
  category: string
  description: string
  descriptionAm: string
  image: string
  gallery: string
  retailValue: string
  entryFee: string
  bidMin: string
  bidStep: string
  minEntries: string
  maxEntriesPerUser: string
  startAt: string
  endAt: string
}

const categories = ['Phones', 'Computers', 'Home', 'Audio', 'Kitchen', 'Wearables', 'Vouchers', 'Other']

const sampleImage =
  'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=1000&q=80'

function newDefaults(): FormState {
  const start = new Date(Date.now() + 60 * 60_000)
  const end = new Date(Date.now() + 3 * 24 * 3600_000)
  return {
    title: '',
    titleAm: '',
    category: 'Phones',
    description: '',
    descriptionAm: '',
    image: sampleImage,
    gallery: sampleImage,
    retailValue: '10000',
    entryFee: '10',
    bidMin: '0.01',
    bidStep: '0.01',
    minEntries: '100',
    maxEntriesPerUser: '3',
    startAt: toLocalInputValue(start.toISOString()),
    endAt: toLocalInputValue(end.toISOString()),
  }
}

function fromAuction(auction: NonNullable<ReturnType<typeof useAuction>>): FormState {
  return {
    title: auction.title,
    titleAm: auction.titleAm,
    category: auction.category,
    description: auction.description,
    descriptionAm: auction.descriptionAm,
    image: auction.image,
    gallery: auction.gallery.join('\n'),
    retailValue: String(auction.retailValue),
    entryFee: String(auction.entryFee),
    bidMin: String(auction.bidMin),
    bidStep: String(auction.bidStep),
    minEntries: String(auction.minEntries),
    maxEntriesPerUser: String(auction.maxEntriesPerUser),
    startAt: toLocalInputValue(auction.startAt),
    endAt: toLocalInputValue(auction.endAt),
  }
}

export default function AdminAuctionForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const auction = useAuction(id)
  const createAuction = useStore((s) => s.createAuction)
  const updateAuction = useStore((s) => s.updateAuction)
  const editing = Boolean(id)

  const initial = useMemo(() => (auction ? fromAuction(auction) : newDefaults()), [auction])
  const [form, setForm] = useState<FormState>(initial)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  if (editing && !auction) {
    return (
      <div className="space-y-4">
        <AdminPageHeader title="Auction not found" description="This auction does not exist in the demo state." />
        <Button variant="secondary" onClick={() => navigate('/admin/auctions')} leftIcon={<ArrowLeft className="h-4 w-4" />}>
          Back to auctions
        </Button>
      </div>
    )
  }

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }))
    setError(null)
  }

  const numbers = {
    retailValue: Number(form.retailValue),
    entryFee: Number(form.entryFee),
    bidMin: Number(form.bidMin),
    bidStep: Number(form.bidStep),
    minEntries: Number(form.minEntries),
    maxEntriesPerUser: Number(form.maxEntriesPerUser),
  }

  const submit = () => {
    setError(null)
    if (!form.title.trim()) {
      setError('Product name is required.')
      return
    }
    if (!form.description.trim()) {
      setError('A product description is required.')
      return
    }
    if (!Number.isFinite(numbers.retailValue) || numbers.retailValue <= 0) {
      setError('Retail value must be greater than zero.')
      return
    }
    if (!Number.isFinite(numbers.entryFee) || numbers.entryFee <= 0) {
      setError('Entry fee must be greater than zero.')
      return
    }
    if (!Number.isFinite(numbers.bidStep) || numbers.bidStep <= 0) {
      setError('Bid step must be greater than zero.')
      return
    }
    if (!Number.isFinite(numbers.minEntries) || numbers.minEntries < 1) {
      setError('Minimum entries must be at least 1.')
      return
    }
    if (!Number.isFinite(numbers.maxEntriesPerUser) || numbers.maxEntriesPerUser < 1) {
      setError('Max entries per user must be at least 1.')
      return
    }
    if (new Date(form.startAt).getTime() >= new Date(form.endAt).getTime()) {
      setError('The end time must be after the start time.')
      return
    }

    const gallery = form.gallery
      .split('\n')
      .map((value) => value.trim())
      .filter(Boolean)

    const payload = {
      title: form.title.trim(),
      titleAm: form.titleAm.trim() || form.title.trim(),
      category: form.category,
      description: form.description.trim(),
      descriptionAm: form.descriptionAm.trim() || form.description.trim(),
      image: form.image.trim() || gallery[0] || sampleImage,
      gallery: gallery.length ? gallery : [form.image.trim() || sampleImage],
      ...numbers,
      startAt: fromLocalInputValue(form.startAt),
      endAt: fromLocalInputValue(form.endAt),
    }

    setSaving(true)
    window.setTimeout(() => {
      const result = editing && auction ? updateAuction(auction.id, payload) : createAuction(payload)
      setSaving(false)
      if (!result.ok) {
        setError(result.error ?? 'Could not save the auction.')
        return
      }
      showToast({
        tone: 'success',
        title: editing ? 'Auction updated' : 'Auction created',
        message: `${payload.title} is ready in the demo.`,
      })
      const createdId = (result as { auction?: { id: string } }).auction?.id ?? ''
      navigate(editing && auction ? `/admin/auctions/${auction.id}` : `/admin/auctions/${createdId}`)
    }, 350)
  }

  const applyPreset = (preset: 'live' | 'weekend' | 'upcoming') => {
    if (preset === 'live') {
      set('startAt', toLocalInputValue(new Date(Date.now() - 5 * 60_000).toISOString()))
      set('endAt', toLocalInputValue(new Date(Date.now() + 60 * 60_000).toISOString()))
    } else if (preset === 'weekend') {
      set('startAt', toLocalInputValue(new Date().toISOString()))
      set('endAt', toLocalInputValue(new Date(Date.now() + 3 * 24 * 3600_000).toISOString()))
    } else {
      set('startAt', toLocalInputValue(new Date(Date.now() + 48 * 3600_000).toISOString()))
      set('endAt', toLocalInputValue(new Date(Date.now() + 7 * 24 * 3600_000).toISOString()))
    }
  }

  const previewImage = form.image.trim() || sampleImage

  return (
    <div className="space-y-5">
      <AdminPageHeader
        eyebrow={editing ? 'Edit auction' : 'New auction'}
        title={editing ? auction?.title ?? 'Edit auction' : 'Create an auction'}
        description={
          editing
            ? 'Changes are written to the client-side store and recorded in the audit log.'
            : 'Set the product, fees, entry limits and bidding window. The auction engine validates the maths.'
        }
        actions={
          <>
            <Link
              to={editing && auction ? `/admin/auctions/${auction.id}` : '/admin/auctions'}
              className="focus-ring inline-flex h-9 items-center gap-1.5 rounded-full border border-line bg-white px-3.5 text-[12px] font-semibold text-ink-muted hover:border-brand/40 hover:text-brand-dark"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Cancel
            </Link>
            <Button size="sm" loading={saving} onClick={submit} leftIcon={<Save className="h-3.5 w-3.5" />}>
              {editing ? 'Save changes' : 'Create auction'}
            </Button>
          </>
        }
      />

      {error ? <AlertBox tone="danger" title="Check the form">{error}</AlertBox> : null}

      <div className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <div className="space-y-4">
          <Card className="p-4">
            <div className="flex items-center gap-2 border-b border-line pb-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-tint text-brand-dark">
                <Layers3 className="h-4 w-4" />
              </span>
              <div>
                <h2 className="text-[13px] font-bold text-ink">Product details</h2>
                <p className="text-[10.5px] text-ink-muted">English and Amharic content shown in the mobile app.</p>
              </div>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="Product name" htmlFor="title" required>
                <Input id="title" value={form.title} onChange={(event) => set('title', event.target.value)} placeholder="e.g. Smart TV 55" />
              </Field>
              <Field label="Amharic name" htmlFor="titleAm" hint="Falls back to the English name if empty.">
                <Input id="titleAm" value={form.titleAm} onChange={(event) => set('titleAm', event.target.value)} placeholder="ስማርት ቲቪ 55" />
              </Field>
              <Field label="Category" htmlFor="category">
                <Select id="category" value={form.category} onChange={(event) => set('category', event.target.value)}>
                  {categories.map((category) => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Image URL" htmlFor="image" hint="Use any public image URL.">
                <Input id="image" value={form.image} onChange={(event) => set('image', event.target.value)} placeholder="https://..." />
              </Field>
              <Field label="Description" htmlFor="description" required className="sm:col-span-2">
                <Textarea id="description" value={form.description} onChange={(event) => set('description', event.target.value)} placeholder="What is included, warranty, delivery..." />
              </Field>
              <Field label="Amharic description" htmlFor="descriptionAm" className="sm:col-span-2" hint="Optional. Falls back to the English description.">
                <Textarea id="descriptionAm" value={form.descriptionAm} onChange={(event) => set('descriptionAm', event.target.value)} />
              </Field>
              <Field label="Gallery URLs" htmlFor="gallery" className="sm:col-span-2" hint="One image URL per line. The first image is the product cover if the image URL is empty.">
                <Textarea id="gallery" value={form.gallery} onChange={(event) => set('gallery', event.target.value)} className="min-h-[80px] font-mono text-[11px]" />
              </Field>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-2 border-b border-line pb-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#EAF2FF] text-[#1D5FB8]">
                <Ticket className="h-4 w-4" />
              </span>
              <div>
                <h2 className="text-[13px] font-bold text-ink">Commercials & limits</h2>
                <p className="text-[10.5px] text-ink-muted">Entry fee, retail value, bid range and participant limits.</p>
              </div>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <Field label="Retail value (ETB)" htmlFor="retailValue" required>
                <Input id="retailValue" type="number" min="1" step="1" value={form.retailValue} onChange={(event) => set('retailValue', event.target.value)} />
              </Field>
              <Field label="Entry fee (ETB)" htmlFor="entryFee" required>
                <Input id="entryFee" type="number" min="0.01" step="0.01" value={form.entryFee} onChange={(event) => set('entryFee', event.target.value)} />
              </Field>
              <Field label="Minimum entries" htmlFor="minEntries" required>
                <Input id="minEntries" type="number" min="1" step="1" value={form.minEntries} onChange={(event) => set('minEntries', event.target.value)} />
              </Field>
              <Field label="Minimum bid (ETB)" htmlFor="bidMin">
                <Input id="bidMin" type="number" min="0" step="0.01" value={form.bidMin} onChange={(event) => set('bidMin', event.target.value)} />
              </Field>
              <Field label="Bid step (ETB)" htmlFor="bidStep">
                <Input id="bidStep" type="number" min="0.01" step="0.01" value={form.bidStep} onChange={(event) => set('bidStep', event.target.value)} />
              </Field>
              <Field label="Max entries / user" htmlFor="maxEntries" className="sm:col-span-1">
                <Input id="maxEntries" type="number" min="1" step="1" value={form.maxEntriesPerUser} onChange={(event) => set('maxEntriesPerUser', event.target.value)} />
              </Field>
              <div className="sm:col-span-2 rounded-xl border border-[#D7EDCF] bg-brand-tint/50 px-3 py-2 text-[10.5px] leading-relaxed text-brand-dark">
                <Info className="mr-1 inline h-3 w-3" />
                Gross fees at minimum entries: <strong>{formatETB(numbers.entryFee * numbers.minEntries)}</strong>. The auction is
                cancelled and all fees are refunded if the minimum is not reached at close.
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-2 border-b border-line pb-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#FFF5E6] text-[#9A5B00]">
                <CalendarClock className="h-4 w-4" />
              </span>
              <div>
                <h2 className="text-[13px] font-bold text-ink">Bidding window</h2>
                <p className="text-[10.5px] text-ink-muted">Use a preset or pick exact local date and time values.</p>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {[
                { key: 'live' as const, label: 'Open now · 1 hour', icon: Sparkles },
                { key: 'weekend' as const, label: 'Open now · 3 days', icon: Wand2 },
                { key: 'upcoming' as const, label: 'Upcoming · 7 days', icon: CalendarClock },
              ].map((preset) => {
                const Icon = preset.icon
                return (
                  <button
                    key={preset.key}
                    type="button"
                    onClick={() => applyPreset(preset.key)}
                    className="focus-ring inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-2.5 py-1.5 text-[10px] font-bold text-ink-muted transition hover:border-brand/40 hover:text-brand-dark"
                  >
                    <Icon className="h-3 w-3" /> {preset.label}
                  </button>
                )
              })}
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="Starts at" htmlFor="startAt">
                <Input id="startAt" type="datetime-local" value={form.startAt} onChange={(event) => set('startAt', event.target.value)} />
              </Field>
              <Field label="Closes at" htmlFor="endAt">
                <Input id="endAt" type="datetime-local" value={form.endAt} onChange={(event) => set('endAt', event.target.value)} />
              </Field>
            </div>
          </Card>
        </div>

        <div className="space-y-4 xl:sticky xl:top-24 xl:self-start">
          <Card className="overflow-hidden">
            <div className="relative aspect-[4/3] bg-page">
              {previewImage ? (
                <img src={previewImage} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-ink-soft">
                  <ImageIcon className="h-8 w-8" />
                </div>
              )}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-3 pb-2.5 pt-8">
                <div className="flex items-center gap-1.5">
                  <Badge tone="green" dot>{form.category}</Badge>
                  <Badge tone="dark">{formatETB(numbers.retailValue || 0)} retail</Badge>
                </div>
                <p className="mt-1.5 truncate text-[13px] font-extrabold text-white">{form.title || 'Untitled product'}</p>
              </div>
            </div>
            <div className="space-y-2 p-3.5 text-[10.5px]">
              <div className="flex items-center justify-between">
                <span className="text-ink-muted">Entry fee</span>
                <span className="font-bold text-ink amount-tabular">{formatETB(numbers.entryFee || 0)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-ink-muted">Minimum bid</span>
                <span className="font-bold text-ink amount-tabular">
                  {formatETB(numbers.bidMin || 0, 2)} · no max
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-ink-muted">Minimum entries</span>
                <span className="font-bold text-ink amount-tabular">{numbers.minEntries || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-ink-muted">Max / user</span>
                <span className="font-bold text-ink amount-tabular">{numbers.maxEntriesPerUser || 0}</span>
              </div>
              <div className="flex items-center justify-between border-t border-line pt-2">
                <span className="text-ink-muted">Gross at minimum</span>
                <span className="font-bold text-brand-dark amount-tabular">{formatETB((numbers.entryFee || 0) * (numbers.minEntries || 0))}</span>
              </div>
            </div>
          </Card>

          <Card className="p-3.5">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-ink-muted">Before you publish</p>
            <ul className="mt-2 space-y-2 text-[10.5px] leading-relaxed text-ink-muted">
              {[
                'Entry fee must cover product cost, VAT, payment fees and refund reserve.',
                'Minimum entries should be realistic for the audience and window.',
                'Sealed bids are hashed with SHA-256 in the browser.',
                'Every change is recorded in the audit log with an admin actor.',
              ].map((line) => (
                <li key={line} className="flex items-start gap-1.5">
                  <CheckCircle2 className="mt-0.5 h-3 w-3 flex-none text-brand-dark" /> {line}
                </li>
              ))}
            </ul>
          </Card>

          <Button full size="lg" loading={saving} onClick={submit} leftIcon={<Save className="h-4 w-4" />}>
            {editing ? 'Save changes' : 'Create auction'}
          </Button>
          <p className="text-center text-[9.5px] text-ink-soft">
            {editing ? 'Editing' : 'Creating'} a client-side demo auction. No payments will be processed.
          </p>
        </div>
      </div>
    </div>
  )
}
