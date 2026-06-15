import { Header } from "@/components/header"
import { Hero } from "@/components/hero"
import { QuienesSomos } from "@/components/quienes-somos"
import { ServicesSection } from "@/components/services-redesigned"
import { Profesionales } from "@/components/profesionales"
import { Booking } from "@/components/booking"
import { OtherServices } from "@/components/other-services"
import { Footer } from "@/components/footer"

export default function Home() {
  return (
    <main className="min-h-screen">
      <Header />
      <Hero />
      <QuienesSomos />
      <ServicesSection />
      <Profesionales />
      <Booking />
      <OtherServices />
      <Footer />
    </main>
  )
}
