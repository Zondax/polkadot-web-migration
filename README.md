# Zondax Migration Web Interface

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

---

![zondax_light](public/assets/zondax_light.png#gh-light-mode-only)
![zondax_dark](public/assets/zondax_dark.png#gh-dark-mode-only)

_Please visit our website at [zondax.ch](https://zondax.ch)_

---

# Polkadot Ledger Migration Tool

A comprehensive web application designed to streamline the migration process to the new Polkadot Universal Ledger App. This platform offers:

- **Elegant User Interface**: A modern, intuitive landing page that clearly explains the migration benefits
- **Step-by-Step Guidance**: An interactive assistant that walks users through each phase of the migration
- **Secure Transition**: Robust protocols ensuring safe transfer from legacy Ledger applications
- **Multi-Chain Support**: Seamless handling of various Substrate-based chains in one unified experience
- **Real-Time Progress Tracking**: Visual indicators showing migration status and completion

Built by Zondax to simplify the complex process of adopting the consolidated Universal Ledger App for the Polkadot ecosystem.

## :gear: Features

- **Modern Stack**

  - Next.js 15 with App Router
  - React 19
  - TypeScript
  - Tailwind CSS
  - Shadcn UI Components
  - Vercel Analytics

- **Polkadot Integration**

  - Ledger Hardware Wallet Support
  - Polkadot API Integration
  - Substrate Protocol Support

- **Development Tools**
  - Biome for code formatting and linting
  - Vitest for testing
  - Playwright for E2E testing

## :chains: Supported Parachains

The following parachains are currently supported with direct RPC endpoints:

- **Acala** (ACA)
- **Ajuna** (AJUN)
- **Astar** (ASTR)
- **Darwinia** (RING)
- **Enjin** (ENJ)
- **HydraDX** (HDX)
- **Karura** (KAR)
- **Kusama** (KSM)
- **Kusama Asset Hub** (KSM)
- **Nodle** (NODL)
- **Pendulum** (PEN)
- **Phala** (PHA)
- **Picasso** (PICA)
- **Polkadex** (PDEX)
- **Sora** (XOR)
- **XXNetwork** (XX)

## Account Discovery

By default, the application synchronizes the first 10 accounts of each app when connecting to a Ledger device. This behavior can be customized by setting the 'NEXT_PUBLIC_MAX_ADDRESSES_TO_FETCH' environment variable to your desired number of accounts.

### Prerequisites

- Node.js (LTS version)
- pnpm (for package management)
- A Polkadot-compatible Ledger device (optional)

## 🧑‍💻 Getting Started

1. Clone the repository:

```bash
git clone [repository-url]
cd polkadot-web-migration
```

2. Install dependencies:

```bash
pnpm install
```

3. Initialize your dev environment:

```bash
pnpm env:init
```

4. Start the development server:

```bash
# For development with limited transfer amount (100 units)
pnpm dev

# For development with full transfer amount
pnpm dev:full-amount
```

The application will be available at `http://localhost:3000`.

## Development

### Available Scripts

- `pnpm dev` - Starts the development server with limited native transfer amounts (100 units), useful for testing with controlled amounts
- `pnpm dev:full-amount` - Starts the development server without transfer amount limitations, allowing full balance transfers
- `pnpm build` - Build for production
- `pnpm build:docker` - Build Docker image for the application
- `pnpm start:docker` - Start the Docker container for the application
- `pnpm start` - Start production server
- `pnpm test` - Run tests with coverage
- `pnpm test:coverage` - Run tests with detailed coverage report
- `pnpm test:watch` - Run tests in watch mode
- `pnpm test:e2e` - Run E2E tests with Playwright
- `pnpm test:e2e:debug` - Run E2E tests in debug mode
- `pnpm test:e2e:ui` - Run E2E tests with UI
- `pnpm test:e2e:install` - Install Playwright browsers
- `pnpm test:e2e:report` - Show Playwright test report
- `pnpm test:e2e:sharding` - Run E2E tests with sharding configuration
- `pnpm lint` - Run Biome linter
- `pnpm lint:fix` - Fix issues with Biome
- `pnpm format` - Format code with Biome and sort package.json
- `pnpm format:check` - Check code formatting
- `pnpm deps:update` - Update dependencies
- `pnpm env:init` - Initialize environment variables

### Project Structure

- `app/` - Next.js app router pages and layouts
- `components/` - Reusable React components
- `config/` - Application configuration
- `lib/` - Utility functions and shared libraries
- `public/` - Static assets
- `state/` - State management logic with legendapp/state

### Architecture

The application follows clean architecture principles:

- Business logic is separated from state management
- Services are agnostic of state management libraries
- Core business logic and interfaces are in separate files
- UI components are modular and composable

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Adding New Chains

This project provides a flexible configuration system for adding custom blockchain networks:

1. Add your chain logo to the `public/logos/chains` directory (the image filename must match the chain `id` you'll use in the configuration)
2. Add chain configuration in the `config/appsConfig.json` file with the following structure:

   ```json
   {
     "id": "your-chain-id",
     "name": "Your Chain Name",
     "bip44Path": "m/44'/123'/0'/0'/0'",
     "ss58Prefix": 42,
     "rpcEndpoint": "wss://rpc.yourchain.network",
     "token": {
       "symbol": "SYMBOL",
       "decimals": 12,
       "logoId": "token-icon-id"
     },
     "explorer": {
       "id": "your-explorer-id",
       "network": "your-network-name"
     }
   }
   ```

Each chain configuration contains these key parameters:

- `id`: Unique identifier for the chain (must match the logo filename in the chains directory)
- `name`: Display name of the chain
- `bip44Path`: The HD derivation path for the chain
- `ss58Prefix`: The SS58 address format prefix
- `rpcEndpoint`: WebSocket endpoint for connecting to the chain
- `token`: An object containing token information:
  - `symbol`: The currency symbol
  - `decimals`: Number of decimal places for the currency
  - `logoId`: (Optional) Used when the token's icon is different from the chain's icon (e.g., Asset Hubs)
- `explorer`: An object containing the explorer information:
  - `id`: The explorer ID you defined in `explorersConfig.json`
  - `network`: The network name to substitute in the explorer's `baseUrl` (e.g., `polkadot`, `kusama`)

For detailed examples of how to structure your chain configuration, refer to the existing entries in the appsConfig.json file.

## Adding New Explorers

This project allows you to easily add or customize blockchain explorers for use throughout the application:

1. Add your explorer configuration to the `config/explorersConfig.json` file with the following structure:

   ```json
   {
     "id": "your-explorer-id",
     "name": "Your Explorer Name",
     "baseUrl": "https://{network}.your-explorer.com",
     "txPath": "/tx/{value}",
     "addressPath": "/account/{value}",
     "blockPath": "/block/{value}"
   }
   ```

Each explorer configuration contains these key parameters:

- `id`: Unique identifier for the explorer (referenced in chain configs)
- `name`: Display name of the explorer
- `baseUrl`: Base URL for the explorer, use `{network}` as a placeholder for the network name (e.g., `polkadot`, `kusama`)
- `txPath`: Path template for transaction details, use `{value}` as a placeholder for the transaction hash
- `addressPath`: Path template for account details, use `{value}` as a placeholder for the account address
- `blockPath`: Path template for block details, use `{value}` as a placeholder for the block hash or number

To associate an explorer with a chain, add or update the `explorer` field in the corresponding entry in `config/appsConfig.json`:

```json
{
  "id": "your-chain-id",
  ...
  "explorer": {
    "id": "your-explorer-id",
    "network": "your-network-name"
  }
}
```

- `id`: The explorer ID you defined in `explorersConfig.json`
- `network`: The network name to substitute in the explorer's `baseUrl` (e.g., `polkadot`, `kusama`)

## License

This project is licensed under the Apache 2.0 License - see the LICENSE file for details.

## Using Docker Scripts

You can use the provided npm scripts to simplify building and running the Docker container:

### Build the Docker image

```sh
pnpm build:docker
```

This runs `docker build -t polkadot-migration .` to create the Docker image.

### Run the Docker container

```sh
pnpm start:docker
```

By default, this will map port 3000 from the container to port 3000 on your local machine. The script uses the `PORT` environment variable, so you can specify a custom port if needed:

```sh
PORT=4000 pnpm start:docker
```

This will map port 4000 on your machine to port 3000 in the container. Then access the app at <http://localhost:4000>
