import { Suspense } from "react"

import { Painel } from "@/components/painel/painel"

export default function Pagina() {
  // O painel lê a URL (município, turno, top); por isso fica dentro de um Suspense.
  return (
    <Suspense>
      <Painel />
    </Suspense>
  )
}
