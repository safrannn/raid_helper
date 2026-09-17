## Where is the executable?

```
server/target/release/server
```

## Running it

```bash
./server
```

Then open <http://localhost:3001> in your browser.

### Options

| Flag     | Default            | Meaning                   |
| -------- | ------------------ | ------------------------- |
| `--addr` | `0.0.0.0:3001`     | Address+port to listen on |
| `--db`   | `./raid_helper.db` | Path to the database      |

Examples:

```bash
./server --addr 127.0.0.1:8080
./server --db ~/raids/mine.db
RUST_LOG=info ./server
```

Stop the server with `Ctrl-C`.

## How to build

```bash
./build.sh
```

`build.sh` does two things in order:

1. `npm run build` in `frontend/`: exports the Next.js app as static files into
   `frontend/out/`.
2. `cargo build --release` in `server/`: compiles the server and embeds `frontend/out/`
   and `database/raid_helper.db` into the binary.

other:

- If database has been editted, rebuild step 2.
- `./build.sh --run` builds and then launches the server immediately.
- to build for another platform(windows or linux), run `build.sh` on that platform
  or cross-compile with `cargo build --release --target <triple>`.
