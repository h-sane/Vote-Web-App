
# Vote Secure Campus

A secure college voting web application built with React, Supabase, and blockchain technology featuring biometric authentication.

## 🔐 Features

### Core Functionality
- **User Registration**: Form with full name, roll number, email, password, and fingerprint scan
- **Biometric Login**: WebAuthn-based fingerprint authentication with fallback simulation
- **Secure Voting**: One vote per user with blockchain verification
- **Admin Panel**: Candidate management, election creation, and real-time results
- **Real-time Results**: Live vote counts with blockchain transparency

### Security Features
- Fingerprint authentication using WebAuthn API
- Blockchain-style vote hashing and chain verification
- Row Level Security (RLS) policies in Supabase
- Audit logging for all actions
- No duplicate voting enforcement

## 🧠 Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS
- **Backend**: Supabase (Auth, Database, Real-time)
- **Biometric**: WebAuthn API with crypto-js hashing
- **Blockchain**: Ethereum-compatible smart contract (Solidity)
- **UI Components**: Shadcn/ui, Lucide React icons
- **Hosting**: Vercel-ready deployment

## 📦 Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd vote-secure-campus
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
# Already configured in supabase/config.toml
# No additional environment setup needed
```

4. Start the development server:
```bash
npm run dev
```

## 🧪 Test Credentials

### Sample Voters
1. **Student 1**
   - Email: `student1@college.edu`
   - Password: `SecurePass123!`
   - Roll Number: `CS2021001`
   - Name: `Alice Johnson`

2. **Student 2**
   - Email: `student2@college.edu`
   - Password: `SecurePass123!`
   - Roll Number: `CS2021002`
   - Name: `Bob Smith`

### Admin Account
- Email: `admin@college.edu`
- Password: `AdminPass123!`
- Role: Administrator

**Note**: These accounts need to be created through the registration process. The first user to register with admin privileges will become the admin.

## 🛡️ Security Implementation

### Biometric Authentication
- Uses WebAuthn API for real fingerprint scanning when available
- Falls back to simulated fingerprint hashing for testing
- Stores hashed fingerprint templates, never raw biometric data
- Device information logging for audit trails

### Blockchain Integration
- Smart contract deployed for vote storage (Solidity)
- Each vote generates a cryptographic hash
- Chain verification with previous vote hashing
- Immutable vote records with timestamp verification

### Database Security
- Row Level Security (RLS) on all tables
- User-specific data access policies
- Admin-only election and candidate management
- Encrypted session management

## 📋 Smart Contract

The `VoteSecureCampus` smart contract includes:
- Election creation and management
- Candidate registration
- Secure vote casting with hash verification
- Real-time result computation
- Vote history tracking
- Admin-only functions for election control

### Contract Functions
- `createElection()` - Create new voting session
- `addCandidate()` - Add candidates to election
- `vote()` - Cast encrypted vote
- `getElectionResults()` - Fetch real-time results
- `hasVoted()` - Check voting status

## 🚀 Deployment

### Vercel Deployment
1. Connect your GitHub repository to Vercel
2. Configure build settings:
   - Build Command: `npm run build`
   - Output Directory: `dist`
3. Deploy automatically on commits

### Supabase Configuration
Database is already configured with:
- User profiles table
- Elections and candidates tables
- Voting records with blockchain hashing
- Biometric data storage
- Audit logging system

## 🔧 Development

### Project Structure
```
src/
├── components/ui/          # Shadcn UI components
├── pages/                  # Main application pages
│   ├── Index.tsx          # Landing page
│   ├── Auth.tsx           # Registration/Login
│   ├── Dashboard.tsx      # Voting interface
│   └── Admin.tsx          # Admin panel
├── contracts/             # Smart contract code
├── utils/                 # Utility functions
└── integrations/          # Supabase client
```

### Key Components
- **Auth.tsx**: Biometric registration and login
- **Dashboard.tsx**: Voting interface with real-time results
- **Admin.tsx**: Election management and analytics
- **blockchain.ts**: Ethereum integration utilities

## 🧪 Testing

### Biometric Testing
- WebAuthn works on HTTPS and localhost
- Fallback simulation for non-compatible browsers
- Mock fingerprint generation for development

### Blockchain Testing
- Simulation mode when MetaMask not available
- Smart contract deployment to testnets
- Gas fee estimation and optimization

## 📊 Features Roadmap

- [ ] Multi-factor authentication
- [ ] Mobile app support
- [ ] Advanced analytics dashboard
- [ ] Integration with student information systems
- [ ] Automated election scheduling
- [ ] Email notifications
- [ ] Candidate profile pages
- [ ] Voting history export

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/new-feature`)
3. Commit changes (`git commit -am 'Add new feature'`)
4. Push to branch (`git push origin feature/new-feature`)
5. Create Pull Request

## 📄 License

This project is licensed under the MIT License. See LICENSE file for details.

## 🔒 Security Considerations

- Never store raw biometric data
- Use HTTPS in production
- Regular security audits recommended
- Smart contract auditing before mainnet deployment
- Rate limiting for authentication attempts
- Regular backup of vote data

## 📞 Support

For technical support or questions:
- Create an issue in the repository
- Check the documentation
- Review the test credentials above

---

**Vote Secure Campus** - Making college elections transparent, secure, and accessible for everyone.
