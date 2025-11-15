'use client'

import { useState } from 'react'
import { SupportTicketForm } from '@/components/support-ticket-form'
import { TicketsList } from '@/components/tickets-list'
import { Button } from '@/components/ui/button'

export default function Playground() {
    const [activeView, setActiveView] = useState<'create' | 'list'>('create')

    return (
        <main className="min-h-screen bg-background">
            <div className="border-b bg-white sticky top-0 z-10 shadow-sm">
                <div className="max-w-6xl mx-auto p-4 flex gap-2">
                    <Button
                        variant={activeView === 'create' ? 'default' : 'outline'}
                        onClick={() => setActiveView('create')}
                    >
                        Crear Ticket
                    </Button>
                    <Button
                        variant={activeView === 'list' ? 'default' : 'outline'}
                        onClick={() => setActiveView('list')}
                    >
                        Ver Tickets
                    </Button>
                </div>
            </div>

            {activeView === 'create' ? <SupportTicketForm /> : <TicketsList />}
        </main>
    )
}
