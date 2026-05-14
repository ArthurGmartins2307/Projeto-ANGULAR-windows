import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

/** 
 * =========================================================================
 * 🔑 CONFIGURAÇÕES GERAIS
 * =========================================================================
 */
const SUPABASE_URL = 'https://nqsqepsyaaplcvwvibxp.supabase.co'; 
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5xc3FlcHN5YWFwbGN2d3ZpYnhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3MzM3MzMsImV4cCI6MjA5NDMwOTczM30.ql5FCeA24koqaGNT9d7ke_NuxOoAIBgD9uUJTp1jVkA';

const ADMIN_EMAILS = [
  'arthurgmgalvao@gmail.com',
  'noaheana@gmail.com'
];

class SupabaseConnection {
  private sessionToken: string | null = null;
  public userId: string | null = null;
  
  setSession(token: string, userId: string) {
    this.sessionToken = token;
    this.userId = userId;
  }
  
  private getHeaders(useAuth = false) {
    const headers: any = {
      'apikey': SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    };
    if (useAuth && this.sessionToken) {
      headers['Authorization'] = `Bearer ${this.sessionToken}`;
    } else {
      headers['Authorization'] = `Bearer ${SUPABASE_ANON_KEY}`;
    }
    return headers;
  }
  
  async login(email: string, password: string): Promise<{error?: string, token?: string, userId?: string}> {
    try {
      const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: this.getHeaders(false),
        body: JSON.stringify({ email, password })
      });
      const data = await response.json();
      if (!response.ok) return { error: data.error_description || data.msg || 'Erro de credenciais' };
      this.setSession(data.access_token, data.user.id);
      return { token: data.access_token, userId: data.user.id };
    } catch (e: any) {
      return { error: e.message };
    }
  }

  async register(email: string, password: string): Promise<{error?: string, success?: boolean}> {
    try {
      const response = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
        method: 'POST',
        headers: this.getHeaders(false),
        body: JSON.stringify({ email, password })
      });
      const data = await response.json();
      if (!response.ok) return { error: data.error_description || data.msg || 'Erro ao registrar' };
      if (data.session) this.setSession(data.session.access_token, data.user.id);
      return { success: true };
    } catch (e: any) {
      return { error: e.message };
    }
  }

  async getTickets(isAdmin: boolean): Promise<Ticket[]> {
    try {
      let url = `${SUPABASE_URL}/rest/v1/tickets?order=created_at.desc`;
      if (!isAdmin && this.userId) url += `&user_id=eq.${this.userId}`;
      const response = await fetch(url, { method: 'GET', headers: this.getHeaders(true) });
      if (!response.ok) throw new Error('Erro na conexão');
      return await response.json();
    } catch (error) {
      console.error(error);
      return []; 
    }
  }

  async insertTicket(ticket: Partial<Ticket>): Promise<any> {
    try {
      if (!ticket.user_id && this.userId) ticket.user_id = this.userId;
      await fetch(`${SUPABASE_URL}/rest/v1/tickets`, {
        method: 'POST',
        headers: this.getHeaders(true),
        body: JSON.stringify(ticket)
      });
    } catch (error) {
      console.error('Erro ao inserir', error);
    }
  }

  async updateTicket(id: number, status: string): Promise<any> {
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/tickets?id=eq.${id}`, {
        method: 'PATCH',
        headers: this.getHeaders(true),
        body: JSON.stringify({ status })
      });
    } catch (error) {
      console.error('Erro ao atualizar', error);
    }
  }
}

export interface Ticket {
  id: number;
  title: string;
  description: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  created_at: string;
  user_id?: string;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
<div class="app-container">

  <!-- ================= TELA DE LOGIN ================= -->
  @if (!isAuthenticated) {
    <div class="auth-container">
      <div class="auth-box">
        <div class="auth-logo">
          <div class="logo-icon">
            <i class="fa-solid fa-fire-flame-curved"></i>
          </div>
          <h1>FlameDesk</h1>
          <p>O melhor sistema premium de suporte.</p>
        </div>

        <div class="auth-form">
          <h2>{{ isRegistering ? 'Criar sua Conta' : 'Acesse sua Conta' }}</h2>
          
          @if (authError) {
            <div class="alert error">
              <i class="fa-solid fa-circle-exclamation"></i>
              {{ authError }}
            </div>
          }

          <div class="form-group">
            <label>E-mail</label>
            <input type="email" [(ngModel)]="authEmail" placeholder="seu@email.com">
          </div>

          <div class="form-group">
            <label>Senha</label>
            <input type="password" [(ngModel)]="authPassword" placeholder="••••••••">
          </div>

          <button class="btn-primary w-100 mt-20" (click)="isRegistering ? doRegister() : doLogin()" [disabled]="isAuthLoading">
            @if (isAuthLoading) {
              <i class="fa-solid fa-spinner fa-spin"></i> Processando...
            } @else {
              {{ isRegistering ? 'Cadastrar e Entrar' : 'Entrar no Sistema' }}
            }
          </button>

          <div class="auth-switch">
            @if (isRegistering) {
              <p>Já possui uma conta? <a href="javascript:void(0)" (click)="isRegistering = false">Fazer Login</a></p>
            } @else {
              <p>Novo por aqui? <a href="javascript:void(0)" (click)="isRegistering = true">Crie uma conta grátis</a></p>
            }
          </div>
        </div>
      </div>
    </div>
  } 
  
  <!-- ================= TELA DE ADMINISTRAÇÃO ================= -->
  @else if (isAdmin) {
    <!-- Sidebar / Nav -->
    <aside class="sidebar">
      <div class="logo-area">
        <div class="logo-icon">
          <i class="fa-solid fa-fire-flame-curved"></i>
        </div>
        <h1 class="logo-text">FlameDesk</h1>
        <span class="role-badge">Admin</span>
      </div>
      
      <nav class="nav-menu">
        <a href="javascript:void(0)" class="nav-item" [class.active]="currentView === 'dashboard'" (click)="changeView('dashboard')">
          <i class="fa-solid fa-chart-pie"></i>
          <span>Dashboard Geral</span>
        </a>
        <a href="javascript:void(0)" class="nav-item" [class.active]="currentView === 'my_tickets'" (click)="changeView('my_tickets')">
          <i class="fa-solid fa-ticket"></i>
          <span>Chamados em Aberto</span>
        </a>
        <a href="javascript:void(0)" class="nav-item" [class.active]="currentView === 'team'" (click)="changeView('team')">
          <i class="fa-solid fa-users"></i>
          <span>Equipe Técnica</span>
        </a>
        <a href="javascript:void(0)" class="nav-item" [class.active]="currentView === 'settings'" (click)="changeView('settings')">
          <i class="fa-solid fa-gear"></i>
          <span>Ajustes do Painel</span>
        </a>
      </nav>
      
      <div class="user-profile">
        <div class="avatar">
          <img src="https://ui-avatars.com/api/?name=Admin&background=ff5e00&color=fff" alt="Avatar">
        </div>
        <div class="user-info">
          <span class="user-name">{{ authEmail.split('@')[0] }}</span>
          <a href="javascript:void(0)" class="logout-btn" (click)="logout()">Sair</a>
        </div>
      </div>
    </aside>

    <!-- Main Content -->
    <main class="main-content">
      <header class="topbar">
        <div class="search-bar">
          <i class="fa-solid fa-magnifying-glass"></i>
          <input type="text" placeholder="Buscar chamados...">
        </div>
        
        <div class="actions">
          <button class="btn-icon">
            <i class="fa-regular fa-bell"></i>
          </button>
        </div>
      </header>

      <div class="content-body">
        @if (currentView === 'dashboard' || currentView === 'my_tickets') {
          @if (currentView === 'dashboard') {
            <section class="stats-grid">
              <div class="stat-card">
                <div class="stat-icon open"><i class="fa-solid fa-folder-open"></i></div>
                <div class="stat-details"><h3>{{ openTickets }}</h3><p>Em Aberto</p></div>
              </div>
              <div class="stat-card">
                <div class="stat-icon total"><i class="fa-solid fa-layer-group"></i></div>
                <div class="stat-details"><h3>{{ totalTickets }}</h3><p>Total de Chamados</p></div>
              </div>
              <div class="stat-card">
                <div class="stat-icon resolved"><i class="fa-solid fa-circle-check"></i></div>
                <div class="stat-details"><h3>{{ resolvedTickets }}</h3><p>Resolvidos</p></div>
              </div>
            </section>
          }

          <!-- Tickets Area -->
          <section class="tickets-section">
            <div class="section-header">
              <h2>{{ currentView === 'dashboard' ? 'Fila Geral de Atendimento' : 'Chamados Não Resolvidos' }}</h2>
            </div>

            <div class="tickets-list">
              @if (isLoading) {
                <div class="loading-state">
                  <i class="fa-solid fa-circle-notch fa-spin"></i>
                  <p>Sincronizando com o Supabase...</p>
                </div>
              } @else {
                @if (filteredTickets.length === 0) {
                  <div class="empty-state">
                    <i class="fa-solid fa-box-open"></i>
                    <p>Nenhum chamado pendente no momento.</p>
                  </div>
                }
                
                @for (ticket of filteredTickets; track ticket.id) {
                  <div class="ticket-card" [class.resolved]="ticket.status === 'RESOLVED'">
                    <div class="ticket-status-bar" [ngClass]="ticket.status.toLowerCase()"></div>
                    <div class="ticket-content">
                      <div class="ticket-header">
                        <span class="ticket-id">#{{ ticket.id | number:'3.0-0' }}</span>
                        <h3 class="ticket-title">{{ ticket.title }}</h3>
                      </div>
                      <p class="ticket-desc">{{ ticket.description }}</p>
                      <div class="ticket-meta">
                        <div class="meta-item"><i class="fa-regular fa-clock"></i><span>{{ ticket.created_at | date:'dd/MM/yyyy HH:mm' }}</span></div>
                        <div class="badges">
                          <span class="badge-priority" [ngClass]="ticket.priority.toLowerCase()"><i class="fa-solid" [ngClass]="{'fa-arrow-up': ticket.priority === 'HIGH', 'fa-minus': ticket.priority === 'MEDIUM', 'fa-arrow-down': ticket.priority === 'LOW'}"></i> {{ getPriorityLabel(ticket.priority) }}</span>
                          <span class="badge-status" [ngClass]="ticket.status.toLowerCase()">{{ getStatusLabel(ticket.status) }}</span>
                        </div>
                      </div>
                    </div>
                    <div class="ticket-actions">
                      @if (ticket.status === 'OPEN') {
                        <button class="action-btn process" (click)="updateStatus(ticket, 'IN_PROGRESS')" title="Iniciar Atendimento"><i class="fa-solid fa-play"></i></button>
                      }
                      @if (ticket.status !== 'RESOLVED') {
                        <button class="action-btn resolve" (click)="updateStatus(ticket, 'RESOLVED')" title="Marcar como Resolvido"><i class="fa-solid fa-check"></i></button>
                      }
                      @if (ticket.status === 'RESOLVED') {
                        <button class="action-btn reopen" (click)="updateStatus(ticket, 'OPEN')" title="Reabrir Chamado"><i class="fa-solid fa-rotate-left"></i></button>
                      }
                    </div>
                  </div>
                }
              }
            </div>
          </section>
        }
        
        @if (currentView === 'team') {
          <div class="placeholder-view">
            <div class="placeholder-icon"><i class="fa-solid fa-users"></i></div>
            <h2>Membros da Equipe</h2>
            <p>Gerencie seus agentes de suporte e atribuições aqui.</p>
          </div>
        }

        @if (currentView === 'settings') {
          <div class="placeholder-view">
            <div class="placeholder-icon"><i class="fa-solid fa-gear"></i></div>
            <h2>Configurações do Sistema</h2>
            <p>Ajuste SLAs e áreas da empresa.</p>
          </div>
        }
      </div>
    </main>
  }

  <!-- ================= TELA DO USUÁRIO COMUM ================= -->
  @else {
    <div class="user-portal-wrapper">
      <header class="portal-header">
        <div class="portal-nav">
          <div class="logo-area-simple">
            <div class="logo-icon-simple"><i class="fa-solid fa-fire-flame-curved"></i></div>
            <h1 class="logo-text">FlameDesk Support</h1>
          </div>
          <div class="portal-user-actions">
            <span class="welcome-text">Olá, {{ authEmail.split('@')[0] }}</span>
            <button class="btn-logout-simple" (click)="logout()">Sair da Conta</button>
          </div>
        </div>

        <div class="portal-hero">
          <h1>Como podemos ajudar você hoje?</h1>
          <p>Se você encontrou algum problema ou tem uma solicitação, estamos aqui para resolver.</p>
          <button class="btn-hero-primary" (click)="openForm()">
            <i class="fa-solid fa-comment-dots"></i> Nova Reclamação ou Pedido
          </button>
        </div>
      </header>

      <main class="portal-body">
        <section class="portal-tickets-section">
          <h2>Seus Chamados Recentes</h2>
          <p class="section-subtitle">Acompanhe o andamento das suas solicitações abertas conosco.</p>

          <div class="tickets-list portal-list">
            @if (isLoading) {
              <div class="loading-state">
                <i class="fa-solid fa-circle-notch fa-spin"></i>
                <p>Buscando seus chamados...</p>
              </div>
            } @else {
              @if (tickets.length === 0) {
                <div class="empty-state-portal">
                  <div class="empty-icon"><i class="fa-solid fa-mug-hot"></i></div>
                  <h3>Tudo tranquilo por aqui!</h3>
                  <p>Você não possui nenhum chamado aberto no momento. Se precisar de algo, clique no botão acima.</p>
                </div>
              }
              
              @for (ticket of tickets; track ticket.id) {
                <div class="ticket-card simple-card" [class.resolved]="ticket.status === 'RESOLVED'">
                  <div class="ticket-status-bar" [ngClass]="ticket.status.toLowerCase()"></div>
                  <div class="ticket-content">
                    <div class="ticket-header">
                      <span class="ticket-id">#{{ ticket.id | number:'3.0-0' }}</span>
                      <h3 class="ticket-title">{{ ticket.title }}</h3>
                    </div>
                    <p class="ticket-desc">{{ ticket.description }}</p>
                    <div class="ticket-meta">
                      <div class="meta-item"><i class="fa-regular fa-clock"></i><span>Enviado em {{ ticket.created_at | date:'dd/MM/yyyy HH:mm' }}</span></div>
                      <div class="badges">
                        <span class="badge-status" [ngClass]="ticket.status.toLowerCase()">{{ getStatusLabel(ticket.status) }}</span>
                      </div>
                    </div>
                  </div>
                </div>
              }
            }
          </div>
        </section>
      </main>
    </div>
  }

  <!-- ================= MODAL NOVO CHAMADO ================= -->
  @if (showNewTicketForm) {
    <div class="modal-overlay" (click)="closeForm()">
      <div class="modal-content" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h2>{{ isAdmin ? 'Criar Ticket Interno' : 'Abrir Solicitação' }}</h2>
          <button class="close-btn" (click)="closeForm()"><i class="fa-solid fa-xmark"></i></button>
        </div>
        
        <div class="modal-body">
          <div class="form-group">
            <label>Qual o assunto?</label>
            <input type="text" [(ngModel)]="newTicketTitle" placeholder="Ex: Erro ao tentar emitir nota fiscal">
          </div>
          
          <div class="form-group">
            <label>Nível de Urgência</label>
            <div class="priority-selector">
              <label class="priority-option low" [class.selected]="newTicketPriority === 'LOW'">
                <input type="radio" name="priority" [value]="'LOW'" [(ngModel)]="newTicketPriority">
                Baixa (Dúvida)
              </label>
              <label class="priority-option medium" [class.selected]="newTicketPriority === 'MEDIUM'">
                <input type="radio" name="priority" [value]="'MEDIUM'" [(ngModel)]="newTicketPriority">
                Média (Normal)
              </label>
              <label class="priority-option high" [class.selected]="newTicketPriority === 'HIGH'">
                <input type="radio" name="priority" [value]="'HIGH'" [(ngModel)]="newTicketPriority">
                Alta (Urgente)
              </label>
            </div>
          </div>
          
          <div class="form-group">
            <label>Explique com mais detalhes</label>
            <textarea [(ngModel)]="newTicketDesc" rows="4" placeholder="Nos conte exatamente o que aconteceu para que possamos te ajudar mais rápido..."></textarea>
          </div>
        </div>
        
        <div class="modal-footer">
          <button class="btn-secondary" (click)="closeForm()">Cancelar</button>
          <button class="btn-primary" (click)="createTicket()" [disabled]="!newTicketTitle || !newTicketDesc">
            <i class="fa-solid fa-paper-plane"></i> Enviar Solicitação
          </button>
        </div>
      </div>
    </div>
  }
</div>
`,
  styles: [`
:host {
  display: block;
  --primary-color: #ff5e00;
  --primary-glow: rgba(255, 94, 0, 0.4);
  --secondary-color: #e54d00;
  --bg-panel: #1a110d;
  --bg-panel-hover: #261711;
  --border-color: #3d2317;
  --text-main: #ffffff;
  --text-muted: #b8988a;
  
  --status-open: #ff9900;
  --status-progress: #3b82f6;
  --status-resolved: #22c55e;
  
  --priority-high: #ff3333;
  --priority-medium: #ffaa00;
  --priority-low: #1aa64b;
}

.app-container {
  display: flex;
  height: 100vh;
  width: 100%;
  overflow: hidden;
}

/* ================= AUTHENTICATION STYLES ================= */
.auth-container {
  display: flex;
  width: 100%;
  height: 100vh;
  align-items: center;
  justify-content: center;
  background-image: radial-gradient(circle at 50% 0%, rgba(200, 60, 10, 0.15) 0%, rgba(12, 8, 6, 1) 100%);
}

.auth-box {
  background: rgba(20, 12, 9, 0.8);
  backdrop-filter: blur(16px);
  border: 1px solid var(--border-color);
  border-radius: 24px;
  padding: 40px;
  width: 100%;
  max-width: 440px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 40px var(--primary-glow);
  display: flex;
  flex-direction: column;
  gap: 30px;
}

.auth-logo {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 12px;
}

.auth-logo .logo-icon {
  width: 56px;
  height: 56px;
  font-size: 1.8rem;
  margin-bottom: 8px;
  border-radius: 12px;
  background: linear-gradient(135deg, #ff8a00, #ff1100);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  box-shadow: 0 4px 15px var(--primary-glow);
}

.auth-logo h1 {
  font-size: 1.8rem;
  font-weight: 800;
  background: linear-gradient(to right, #ffffff, #ffb380);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.auth-logo p {
  color: var(--text-muted);
  font-size: 0.95rem;
}

.auth-form h2 {
  font-size: 1.3rem;
  margin-bottom: 24px;
  color: white;
  text-align: center;
}

.w-100 { width: 100%; justify-content: center; }
.mt-20 { margin-top: 20px; }

.auth-switch {
  text-align: center;
  margin-top: 24px;
  font-size: 0.9rem;
  color: var(--text-muted);
}

.auth-switch a {
  color: var(--primary-color);
  font-weight: 600;
  text-decoration: none;
}

.auth-switch a:hover {
  color: #ff8a00;
  text-decoration: underline;
}

.alert {
  padding: 12px 16px;
  border-radius: 8px;
  margin-bottom: 20px;
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 500;
}

.alert.error {
  background: rgba(255, 51, 51, 0.1);
  color: #ff6666;
  border: 1px solid rgba(255, 51, 51, 0.3);
}

/* ================= ADMIN INTERFACE (SIDEBAR & MAIN) ================= */

.sidebar {
  width: 280px;
  background-color: rgba(18, 11, 8, 0.85);
  backdrop-filter: blur(12px);
  border-right: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  padding: 1.5rem;
  z-index: 10;
  box-shadow: 4px 0 24px rgba(0,0,0,0.4);
}

.logo-area {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 3rem;
  position: relative;
}

.logo-icon {
  width: 42px;
  height: 42px;
  border-radius: 12px;
  background: linear-gradient(135deg, #ff8a00, #ff1100);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  color: white;
}

.logo-text {
  font-size: 1.5rem;
  font-weight: 800;
  letter-spacing: -0.5px;
  background: linear-gradient(to right, #ffffff, #ffb380);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.role-badge {
  position: absolute;
  top: -10px;
  right: -10px;
  background: #ff2a00;
  color: white;
  font-size: 0.65rem;
  padding: 2px 6px;
  border-radius: 6px;
  font-weight: bold;
  letter-spacing: 1px;
  text-transform: uppercase;
}

.nav-menu {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 16px;
  color: var(--text-muted);
  text-decoration: none;
  border-radius: 10px;
  transition: all 0.2s ease;
  font-weight: 500;
}

.nav-item:hover {
  background-color: var(--bg-panel-hover);
  color: var(--text-main);
  transform: translateX(4px);
}

.nav-item.active {
  background: linear-gradient(90deg, rgba(255, 94, 0, 0.15) 0%, transparent 100%);
  color: var(--primary-color);
  border-left: 3px solid var(--primary-color);
}

.user-profile {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background-color: var(--bg-panel);
  border-radius: 14px;
  border: 1px solid var(--border-color);
  margin-top: auto;
}

.avatar img {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 2px solid var(--primary-color);
}

.user-info {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.user-name {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-main);
  text-overflow: ellipsis;
  white-space: nowrap;
  overflow: hidden;
}

.logout-btn {
  font-size: 0.8rem;
  color: #ff6666;
  text-decoration: none;
  margin-top: 2px;
}
.logout-btn:hover { text-decoration: underline; }

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}

.topbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem 2.5rem;
  background: rgba(12, 8, 6, 0.6);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid var(--border-color);
  position: sticky;
  top: 0;
  z-index: 5;
}

.search-bar {
  position: relative;
  width: 350px;
}

.search-bar i {
  position: absolute;
  left: 16px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-muted);
}

.search-bar input {
  width: 100%;
  background-color: var(--bg-panel);
  border: 1px solid var(--border-color);
  padding: 12px 16px 12px 42px;
  border-radius: 100px;
  color: white;
  font-family: 'Inter', sans-serif;
  transition: all 0.3s ease;
}

.actions {
  display: flex;
  align-items: center;
  gap: 16px;
}

.btn-icon {
  background: var(--bg-panel);
  border: 1px solid var(--border-color);
  color: var(--text-muted);
  width: 44px;
  height: 44px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-icon:hover {
  color: white;
  background: var(--bg-panel-hover);
  border-color: var(--primary-color);
}

/* ================= COMMON SHARED STYLES ================= */

.btn-primary {
  background: linear-gradient(135deg, var(--primary-color), #ff2a00);
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 100px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  box-shadow: 0 4px 15px var(--primary-glow);
  transition: all 0.3s;
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px var(--primary-glow);
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.btn-secondary {
  background: transparent;
  color: var(--text-muted);
  border: 1px solid var(--border-color);
  padding: 12px 24px;
  border-radius: 100px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-secondary:hover {
  background: var(--bg-panel);
  color: white;
  border-color: #593525;
}

.content-body {
  padding: 2.5rem;
}

/* Admin Dashboard Stats */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 20px;
  margin-bottom: 2.5rem;
}

.stat-card {
  background-color: var(--bg-panel);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  transition: transform 0.3s, box-shadow 0.3s;
}

.stat-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 10px 25px rgba(0,0,0,0.3);
  border-color: #593525;
}

.stat-icon {
  width: 54px;
  height: 54px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
}

.stat-icon.open { background: rgba(255, 153, 0, 0.1); color: var(--status-open); }
.stat-icon.total { background: rgba(255, 94, 0, 0.1); color: var(--primary-color); }
.stat-icon.resolved { background: rgba(34, 197, 94, 0.1); color: var(--status-resolved); }

.stat-details h3 {
  font-size: 1.8rem;
  margin-bottom: 4px;
  color: white;
}

.stat-details p {
  color: var(--text-muted);
  font-size: 0.9rem;
}

/* Tickets Grid */
.tickets-section {
  background-color: rgba(26, 17, 13, 0.4);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  padding: 24px;
  min-height: 400px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.section-header h2 {
  font-size: 1.4rem;
  font-weight: 600;
}

.tickets-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.loading-state, .empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 0;
  color: var(--text-muted);
}

.loading-state i {
  font-size: 2.5rem;
  color: var(--primary-color);
  margin-bottom: 16px;
}

.empty-state i {
  font-size: 3rem;
  margin-bottom: 16px;
  opacity: 0.5;
}

.ticket-card {
  background: var(--bg-panel);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  display: flex;
  overflow: hidden;
  transition: all 0.2s;
}

.ticket-card:hover {
  border-color: #593525;
  transform: translateX(4px);
  box-shadow: 0 5px 15px rgba(0,0,0,0.2);
}

.ticket-card.resolved { opacity: 0.7; }

.ticket-status-bar { width: 6px; flex-shrink: 0; }
.ticket-status-bar.open { background-color: var(--status-open); }
.ticket-status-bar.in_progress { background-color: var(--status-progress); }
.ticket-status-bar.resolved { background-color: var(--status-resolved); }

.ticket-content {
  padding: 20px;
  flex: 1;
}

.ticket-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.ticket-id {
  font-family: monospace;
  background: #2a1b14;
  color: var(--text-muted);
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 0.85rem;
  font-weight: bold;
}

.ticket-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: white;
}

.ticket-desc {
  color: var(--text-muted);
  font-size: 0.95rem;
  margin-bottom: 16px;
  line-height: 1.5;
}

.ticket-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.85rem;
  color: var(--text-muted);
}

.badges { display: flex; gap: 10px; }

.badge-priority, .badge-status {
  padding: 4px 10px;
  border-radius: 100px;
  font-size: 0.75rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 6px;
}

.badge-priority.high { background: rgba(255, 51, 51, 0.15); color: var(--priority-high); border: 1px solid rgba(255, 51, 51, 0.3); }
.badge-priority.medium { background: rgba(255, 170, 0, 0.15); color: var(--priority-medium); border: 1px solid rgba(255, 170, 0, 0.3); }
.badge-priority.low { background: rgba(26, 166, 75, 0.15); color: var(--priority-low); border: 1px solid rgba(26, 166, 75, 0.3); }

.badge-status { border: 1px solid currentColor; }
.badge-status.open { color: var(--status-open); }
.badge-status.in_progress { color: var(--status-progress); }
.badge-status.resolved { color: var(--status-resolved); }

.ticket-actions {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 8px;
  padding: 0 20px;
  border-left: 1px solid var(--border-color);
  background: rgba(0,0,0,0.1);
}

.action-btn {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  border: none;
  background: #2a1b14;
  color: var(--text-muted);
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.action-btn:hover { transform: scale(1.1); }
.action-btn.process:hover { background: var(--status-progress); color: white; }
.action-btn.resolve:hover { background: var(--status-resolved); color: white; }
.action-btn.reopen:hover { background: var(--status-open); color: white; }


/* ================= USER PORTAL (NOVA UI SIMPLIFICADA) ================= */

.user-portal-wrapper {
  width: 100%;
  height: 100vh;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  background-color: #0c0806;
  background-image: radial-gradient(circle at 50% 0%, rgba(120, 45, 10, 0.15) 0%, rgba(12, 8, 6, 1) 50%);
}

.portal-header {
  padding: 0 5%;
  border-bottom: 1px solid rgba(255,255,255,0.05);
}

.portal-nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 0;
}

.logo-area-simple {
  display: flex;
  align-items: center;
  gap: 12px;
}

.logo-icon-simple {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: linear-gradient(135deg, #ff8a00, #ff1100);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.portal-user-actions {
  display: flex;
  align-items: center;
  gap: 20px;
}

.welcome-text {
  color: var(--text-muted);
  font-weight: 500;
}

.btn-logout-simple {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: white;
  padding: 8px 16px;
  border-radius: 100px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-logout-simple:hover {
  background: rgba(255, 50, 50, 0.2);
  border-color: rgba(255, 50, 50, 0.5);
  color: #ffcccc;
}

.portal-hero {
  padding: 60px 0;
  text-align: center;
  max-width: 700px;
  margin: 0 auto;
}

.portal-hero h1 {
  font-size: 2.8rem;
  color: white;
  margin-bottom: 16px;
}

.portal-hero p {
  color: var(--text-muted);
  font-size: 1.1rem;
  margin-bottom: 40px;
  line-height: 1.6;
}

.btn-hero-primary {
  background: linear-gradient(135deg, var(--primary-color), #ff2a00);
  color: white;
  border: none;
  padding: 16px 36px;
  border-radius: 100px;
  font-size: 1.1rem;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  box-shadow: 0 10px 30px var(--primary-glow);
  transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.btn-hero-primary:hover {
  transform: translateY(-4px);
  box-shadow: 0 15px 40px var(--primary-glow);
}

.portal-body {
  flex: 1;
  padding: 0 5% 60px 5%;
}

.portal-tickets-section {
  max-width: 900px;
  margin: 0 auto;
}

.portal-tickets-section h2 {
  font-size: 1.8rem;
  color: white;
  margin-bottom: 8px;
}

.section-subtitle {
  color: var(--text-muted);
  margin-bottom: 30px;
}

.empty-state-portal {
  background: var(--bg-panel);
  border: 1px dashed var(--border-color);
  border-radius: 16px;
  padding: 60px 20px;
  text-align: center;
}

.empty-state-portal .empty-icon {
  font-size: 3rem;
  color: #593525;
  margin-bottom: 20px;
}

.empty-state-portal h3 {
  color: white;
  font-size: 1.4rem;
  margin-bottom: 8px;
}

.empty-state-portal p {
  color: var(--text-muted);
}


/* ================= MODAL NOVO CHAMADO ================= */
.modal-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.7);
  backdrop-filter: blur(5px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.modal-content {
  background: var(--bg-panel);
  border: 1px solid var(--border-color);
  border-radius: 20px;
  width: 100%;
  max-width: 600px;
  box-shadow: 0 20px 40px rgba(0,0,0,0.5);
  animation: slideUp 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

@keyframes slideUp {
  from { transform: translateY(30px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px;
  border-bottom: 1px solid var(--border-color);
}

.modal-header h2 { font-size: 1.5rem; color: white; }

.close-btn { background: transparent; border: none; color: var(--text-muted); font-size: 1.2rem; cursor: pointer; }
.close-btn:hover { color: white; }

.modal-body { padding: 24px; display: flex; flex-direction: column; gap: 20px; }

.form-group { display: flex; flex-direction: column; gap: 8px; width: 100%; }
.form-group label { font-weight: 500; color: var(--text-muted); font-size: 0.9rem; }
.form-group input, .form-group textarea {
  background: #110b08; border: 1px solid var(--border-color); padding: 14px;
  border-radius: 10px; color: white; font-family: inherit; font-size: 1rem; transition: all 0.2s; resize: vertical;
}
.form-group input:focus, .form-group textarea:focus { outline: none; border-color: var(--primary-color); }

.priority-selector { display: flex; gap: 12px; }
.priority-option {
  flex: 1; padding: 12px; border: 1px solid var(--border-color); border-radius: 8px;
  text-align: center; cursor: pointer; background: #110b08; color: var(--text-muted); transition: all 0.2s; font-weight: 500;
}
.priority-option input { display: none; }
.priority-option.low.selected { background: rgba(26, 166, 75, 0.15); border-color: var(--priority-low); color: var(--priority-low); }
.priority-option.medium.selected { background: rgba(255, 170, 0, 0.15); border-color: var(--priority-medium); color: var(--priority-medium); }
.priority-option.high.selected { background: rgba(255, 51, 51, 0.15); border-color: var(--priority-high); color: var(--priority-high); }

.modal-footer { padding: 24px; border-top: 1px solid var(--border-color); display: flex; justify-content: flex-end; gap: 12px; }

/* Placeholders de Admin */
.placeholder-view {
  background-color: rgba(26, 17, 13, 0.4); border: 1px solid var(--border-color); border-radius: 16px;
  padding: 60px 24px; display: flex; flex-direction: column; align-items: center; text-align: center; gap: 16px;
}
.placeholder-icon {
  width: 80px; height: 80px; border-radius: 20px; background: var(--bg-panel); border: 1px solid var(--border-color);
  display: flex; align-items: center; justify-content: center; font-size: 2.5rem; color: var(--primary-color); margin-bottom: 8px;
}
.placeholder-view h2 { font-size: 1.8rem; color: white; }
.placeholder-view p { color: var(--text-muted); max-width: 400px; }
`]
})
export class AppComponent implements OnInit {
  db = new SupabaseConnection();
  
  // Autenticação & Role
  isAuthenticated = false;
  isAdmin = false;
  
  isRegistering = false;
  authEmail = '';
  authPassword = '';
  authError = '';
  isAuthLoading = false;

  // Navegação
  currentView = 'dashboard';

  // Estado Principal
  tickets: Ticket[] = [];
  isLoading: boolean = false;
  
  // Estado do Formulário
  showNewTicketForm: boolean = false;
  newTicketTitle: string = '';
  newTicketDesc: string = '';
  newTicketPriority: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
  
  async ngOnInit() { }

  // --- Auth Handlers ---
  
  async doLogin() {
    this.authError = '';
    if (!this.authEmail || !this.authPassword) {
      this.authError = 'Preencha email e senha.';
      return;
    }
    
    this.isAuthLoading = true;
    const res = await this.db.login(this.authEmail, this.authPassword);
    this.isAuthLoading = false;
    
    if (res.error) {
      this.authError = res.error;
    } else {
      this.handleSuccessLogin();
    }
  }

  async doRegister() {
    this.authError = '';
    if (!this.authEmail || !this.authPassword) {
      this.authError = 'Preencha email e senha.';
      return;
    }
    
    this.isAuthLoading = true;
    const res = await this.db.register(this.authEmail, this.authPassword);
    
    if (res.error) {
      this.isAuthLoading = false;
      this.authError = res.error;
    } else {
      const loginRes = await this.db.login(this.authEmail, this.authPassword);
      this.isAuthLoading = false;
      
      if (loginRes.error) {
        this.authError = 'Registrado, mas não pôde logar: ' + loginRes.error;
      } else {
        this.handleSuccessLogin();
      }
    }
  }

  private handleSuccessLogin() {
    this.isAuthenticated = true;
    this.isAdmin = ADMIN_EMAILS.includes(this.authEmail.toLowerCase());
    this.loadTickets();
  }

  logout() {
    this.isAuthenticated = false;
    this.isAdmin = false;
    this.tickets = [];
    this.db.setSession('', '');
    this.authEmail = '';
    this.authPassword = '';
    this.changeView('dashboard');
  }

  // --- Navegação ---

  changeView(view: string) {
    this.currentView = view;
    if (view === 'dashboard' || view === 'my_tickets') {
      this.loadTickets();
    }
  }

  // --- Operações de Ticket ---

  async loadTickets() {
    this.isLoading = true;
    this.tickets = await this.db.getTickets(this.isAdmin);
    this.isLoading = false;
  }

  async createTicket() {
    if (!this.newTicketTitle || !this.newTicketDesc) return;
    
    this.isLoading = true;
    
    await this.db.insertTicket({
      title: this.newTicketTitle,
      description: this.newTicketDesc,
      status: 'OPEN',
      priority: this.newTicketPriority,
      created_at: new Date().toISOString()
    });
    
    this.newTicketTitle = '';
    this.newTicketDesc = '';
    this.newTicketPriority = 'LOW';
    this.showNewTicketForm = false;
    
    await this.loadTickets();
  }

  async updateStatus(ticket: Ticket, newStatus: string) {
    this.isLoading = true;
    ticket.status = newStatus as any; 
    await this.db.updateTicket(ticket.id, newStatus);
    await this.loadTickets();
  }

  // --- Dashboard Stats Computed ---
  
  get totalTickets() { return this.tickets.length; }
  get openTickets() { return this.tickets.filter(t => t.status === 'OPEN').length; }
  get resolvedTickets() { return this.tickets.filter(t => t.status === 'RESOLVED').length; }
  
  get filteredTickets() {
    if (this.currentView === 'my_tickets') {
      return this.tickets.filter(t => t.status !== 'RESOLVED');
    }
    return this.tickets;
  }

  // --- Utils ---
  
  getStatusLabel(status: string) {
    const map: Record<string, string> = {
      'OPEN': 'Aberto',
      'IN_PROGRESS': 'Em Atendimento',
      'RESOLVED': 'Resolvido'
    };
    return map[status] || status;
  }
  
  getPriorityLabel(priority: string) {
    const map: Record<string, string> = {
      'LOW': 'Baixa',
      'MEDIUM': 'Média',
      'HIGH': 'Crítica'
    };
    return map[priority] || priority;
  }
  
  openForm() {
    this.showNewTicketForm = true;
  }
  
  closeForm() {
    this.showNewTicketForm = false;
  }
}
