"use client"

import { useEffect, useState } from "react"
import { Check, ChevronsUpDown, MapPin } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Kbd } from "@/components/ui/kbd"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { nomeProprio, normalizar } from "@/lib/formato"
import type { Municipio } from "@/lib/tipos"
import { cn } from "@/lib/utils"

interface Props {
  municipios: Municipio[]
  valor: string
  carregando: boolean
  erro: string | null
  aoEscolher: (codigo: string) => void
  aoRecarregar: () => void
}

/** Busca sem acento e sem caixa; nomes que começam com o termo vêm primeiro. */
function filtrar(valor: string, busca: string) {
  const alvo = normalizar(valor)
  const termo = normalizar(busca.trim())
  if (!termo || alvo.startsWith(termo)) return 1
  return alvo.includes(termo) ? 0.5 : 0
}

export function SeletorMunicipio({ municipios, valor, carregando, erro, aoEscolher, aoRecarregar }: Props) {
  const [aberto, setAberto] = useState(false)
  const selecionado = municipios.find((municipio) => municipio.codigo === valor)

  // Ctrl+K / ⌘K abre a busca de qualquer lugar da tela.
  useEffect(() => {
    const aoTeclar = (evento: KeyboardEvent) => {
      if ((evento.ctrlKey || evento.metaKey) && evento.key.toLowerCase() === "k") {
        evento.preventDefault()
        setAberto((atual) => !atual)
      }
    }
    window.addEventListener("keydown", aoTeclar)
    return () => window.removeEventListener("keydown", aoTeclar)
  }, [])

  return (
    <Popover open={aberto} onOpenChange={setAberto}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={aberto}
          aria-label="Escolher município"
          className="h-10 w-full justify-between gap-3 border-primary/30 bg-surface/70 px-3 text-left hover:border-primary/60 sm:w-80"
        >
          <span className="flex min-w-0 items-center gap-2">
            <MapPin className="size-4 shrink-0 text-primary" />
            <span className="truncate text-sm font-medium">
              {selecionado ? nomeProprio(selecionado.nome) : carregando ? "Carregando municípios…" : `Município ${valor}`}
            </span>
          </span>
          <span className="flex shrink-0 items-center gap-1.5 text-muted-foreground">
            <Kbd className="hidden sm:inline-flex">Ctrl K</Kbd>
            <ChevronsUpDown className="size-4" />
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-(--radix-popover-trigger-width) min-w-72 border border-primary/25 p-0">
        <Command filter={filtrar}>
          <CommandInput placeholder="Buscar município…" />
          <CommandList>
            <CommandEmpty>
              {erro ? (
                <span className="flex flex-col items-center gap-2">
                  Não foi possível listar os municípios: {erro}
                  <Button size="sm" variant="outline" onClick={aoRecarregar}>
                    Tentar novamente
                  </Button>
                </span>
              ) : carregando ? (
                "Carregando municípios…"
              ) : (
                "Nenhum município encontrado."
              )}
            </CommandEmpty>
            <CommandGroup heading={municipios.length ? `${municipios.length} municípios` : undefined}>
              {municipios.map((municipio) => (
                <CommandItem
                  key={municipio.codigo}
                  value={`${municipio.nome} ${municipio.codigo}`}
                  onSelect={() => {
                    aoEscolher(municipio.codigo)
                    setAberto(false)
                  }}
                >
                  <Check className={cn("size-4 text-primary", municipio.codigo === valor ? "opacity-100" : "opacity-0")} />
                  <span className="flex-1 truncate">{nomeProprio(municipio.nome)}</span>
                  <span className="font-mono text-[11px] text-muted-foreground">{municipio.codigo}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
