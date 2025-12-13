
import { SocialThread } from "../components/SocialMedia";

// --- CONFIGURATION ---
// In a real production app, these come from your backend or environment variables
const API_CONFIG = {
  instagram: {
    baseUrl: 'https://graph.facebook.com/v19.0',
    scopes: 'instagram_basic,instagram_manage_messages,pages_show_list'
  },
  linkedin: {
    baseUrl: 'https://api.linkedin.com/v2',
    scopes: 'w_member_social,r_liteprofile,r_emailaddress'
  },
  gmail: {
    baseUrl: 'https://gmail.googleapis.com/gmail/v1',
    scopes: 'https://www.googleapis.com/auth/gmail.readonly'
  }
};

// --- REAL API IMPLEMENTATIONS (Stubs) ---

export const fetchInstagramConversations = async (accessToken: string, pageId: string): Promise<SocialThread[]> => {
  // Real implementation would go here
  return [];
};

export const fetchLinkedinConversations = async (accessToken: string): Promise<SocialThread[]> => {
  return [];
};

export const fetchGmailThreads = async (accessToken: string): Promise<SocialThread[]> => {
  return [];
};


// --- MOCK DATA GENERATOR (For Demo) ---
// Returns realistic conversation data for simulation

export const getSimulatedInbox = (platform: 'instagram' | 'facebook' | 'linkedin' | 'email' | 'twitter'): SocialThread[] => {
  const now = Date.now();
  const hour = 3600000;
  
  if (platform === 'instagram') {
    return [
      {
        id: 'ig-1',
        platform: 'instagram',
        contactName: 'sophie_designs',
        contactAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80',
        lastMessage: 'Is the pricing on the website up to date?',
        lastTime: '10:42 AM',
        unread: true,
        history: [
          { id: 'm1', sender: 'user', text: 'Hi, I love your recent post about the eco-friendly materials.', timestamp: now - 24 * hour },
          { id: 'm2', sender: 'me', text: 'Thank you Sophie! We try our best. Are you looking to renovate?', timestamp: now - 23 * hour },
          { id: 'm3', sender: 'user', text: 'Yes actually. Is the pricing on the website up to date?', timestamp: now - 100000 },
        ]
      },
      {
        id: 'ig-2',
        platform: 'instagram',
        contactName: 'mark_fitness_99',
        contactAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80',
        lastMessage: 'Sent an attachment',
        lastTime: 'Yesterday',
        unread: false,
        history: [
          { id: 'm4', sender: 'user', text: 'Bro check this out', timestamp: now - 48 * hour },
          { id: 'm5', sender: 'me', text: 'Looks great man!', timestamp: now - 47 * hour },
        ]
      }
    ];
  }

  if (platform === 'facebook') {
    return [
      {
        id: 'fb-1',
        platform: 'facebook',
        contactName: 'Jessica Miller',
        contactAvatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=150&q=80',
        lastMessage: 'Does this integrate with Shopify?',
        lastTime: '1:15 PM',
        unread: true,
        history: [
          { id: 'f1', sender: 'user', text: 'Hi, I saw your ad on Facebook.', timestamp: now - 3 * hour },
          { id: 'f2', sender: 'me', text: 'Hello Jessica! Thanks for reaching out. How can I help you today?', timestamp: now - 2.5 * hour },
          { id: 'f3', sender: 'user', text: 'I run a small store. Does this integrate with Shopify?', timestamp: now - 1 * hour },
        ]
      },
      {
        id: 'fb-2',
        platform: 'facebook',
        contactName: 'David Chen',
        contactAvatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=150&q=80',
        lastMessage: 'Thanks, that works.',
        lastTime: 'Mon',
        unread: false,
        history: [
           { id: 'f4', sender: 'user', text: 'Where can I download the invoice?', timestamp: now - 72 * hour },
           { id: 'f5', sender: 'me', text: 'You can find it in your dashboard under "Billing".', timestamp: now - 71 * hour },
           { id: 'f6', sender: 'user', text: 'Thanks, that works.', timestamp: now - 70 * hour }
        ]
      }
    ];
  }

  if (platform === 'linkedin') {
    return [
      {
        id: 'li-1',
        platform: 'linkedin',
        contactName: 'Dr. Arjen Van Der Berg',
        contactAvatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=150&q=80',
        lastMessage: 'Let\'s schedule a call for next Tuesday.',
        lastTime: '11:20 AM',
        unread: true,
        history: [
          { id: 'l1', sender: 'me', text: 'Hi Arjen, thanks for connecting. I noticed you are leading the new AI initiative.', timestamp: now - 5 * hour },
          { id: 'l2', sender: 'user', text: 'Yes, we are currently looking for vendors. Do you have a capability deck?', timestamp: now - 4 * hour },
          { id: 'l3', sender: 'me', text: 'Absolutely, sending it over now.', timestamp: now - 3.5 * hour },
          { id: 'l4', sender: 'user', text: 'Received. Let\'s schedule a call for next Tuesday.', timestamp: now - 200000 },
        ]
      },
      {
        id: 'li-2',
        platform: 'linkedin',
        contactName: 'Sarah Jenkins (Recruiter)',
        contactAvatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=150&q=80',
        lastMessage: 'Are you open to new opportunities?',
        lastTime: '2d ago',
        unread: false,
        history: [
           { id: 'l5', sender: 'user', text: 'Hi there, came across your profile. Are you open to new opportunities?', timestamp: now - 48 * hour }
        ]
      }
    ];
  }

  if (platform === 'twitter') {
    return [
      {
        id: 'tw-1',
        platform: 'twitter',
        contactName: '@crypto_king',
        contactAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
        lastMessage: 'Wen token launch??',
        lastTime: '5m ago',
        unread: true,
        history: [
          { id: 't1', sender: 'user', text: 'Yo dev', timestamp: now - 600000 },
          { id: 't2', sender: 'user', text: 'Wen token launch??', timestamp: now - 300000 }
        ]
      }
    ];
  }

  if (platform === 'email') {
    return [
      {
        id: 'em-1',
        platform: 'email',
        contactName: 'Amanda Clark (CEO)',
        contactAvatar: 'https://ui-avatars.com/api/?name=Amanda+Clark&background=FFC94A&color=fff',
        lastMessage: 'Re: Partnership Proposal - Q3',
        lastTime: '9:30 AM',
        unread: false,
        history: [
          { id: 'e1', sender: 'user', text: 'Hi team, I reviewed the proposal. It looks solid.', timestamp: now - 6 * hour },
          { id: 'e2', sender: 'me', text: 'Great to hear Amanda. Should we proceed with the contract?', timestamp: now - 5 * hour },
          { id: 'e3', sender: 'user', text: 'Yes, please send it over for signature.', timestamp: now - 4.5 * hour }
        ]
      }
    ];
  }

  return [];
};
