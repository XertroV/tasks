# Common repo-level commands for Python, TypeScript, and Go implementations.

PYTHON ?= python3
BUN ?= bun
GO ?= go

ROOT_BIN := $(CURDIR)/backlog-go
PYTHON_DIR := $(CURDIR)/backlog
TS_DIR := $(CURDIR)/backlog_ts
GO_DIR := $(CURDIR)/backlog_go
GO_BIN_DIR := $(shell $(GO) env GOPATH)/bin

PYTHON_BIN_DIR := $(shell $(PYTHON) -c 'import pathlib,sys; print(pathlib.Path(sys.executable).resolve().parent)')
CLI_EXES := backlog bl
CLI_LINK_DIR := $(if $(strip $(XDG_BIN_HOME)),$(XDG_BIN_HOME),$(HOME)/.local/bin)
CLI_LINK_DIRS := $(CLI_LINK_DIR) /usr/local/bin
CLI_LINK_SOURCE ?=
GO_EXE_NAME ?= backlog_go

.PHONY: help
.PHONY: setup setup-python setup-ts setup-go
.PHONY: test test-python test-ts test-go
.PHONY: check check-python check-ts check-go
.PHONY: build build-go
.PHONY: install-python install-go install-ts install-python-with-links
.PHONY: uninstall-python uninstall-ts uninstall-go
.PHONY: cli-link cli-unlink python-link python-unlink ts-link go-link
.PHONY: parity clean

help:
	@echo "Available targets:"
	@echo "  help          - Show this help"
	@echo "  setup         - Install Python, TypeScript, and Go dev deps"
	@echo "  setup-python  - Install Python package with dev extras (pip install -e .[dev])"
	@echo "  install-python - Install Python package"
	@echo "  install-python-with-links - Install Python package and link executables into CLI_LINK_DIR"
	@echo "  python-link   - Link backlog/bl from $(PYTHON_BIN_DIR) into CLI_LINK_DIR ($(CLI_LINK_DIR))"
	@echo "  python-unlink - Remove backlog/bl from CLI_LINK_DIRS"
	@echo "  cli-link      - Link CLI_EXES from CLI_LINK_SOURCE into CLI_LINK_DIR"
	@echo "  cli-unlink    - Remove backlog/bl from CLI_LINK_DIRS ($(CLI_LINK_DIRS))"
	@echo "  setup-ts      - Install TypeScript dependencies (cd backlog_ts && bun install)"
	@echo "  ts-link       - Link TS exes (backlog, bl) from backlog_ts/bin into CLI_LINK_DIR"
	@echo "  install-ts    - Install TypeScript dependencies and link CLI commands"
	@echo "  setup-go      - Download Go dependencies (cd backlog_go && go mod download)"
	@echo "  install-go    - Install Go CLI with 'go install .'"
	@echo "  go-link       - Link Go exes (backlog, bl) from $(GO_BIN_DIR)/$(GO_EXE_NAME)"
	@echo "  uninstall-go  - Remove installed Go binaries from $(GO_BIN_DIR)"
	@echo "  uninstall-ts  - Remove TypeScript install artifacts (node_modules)"
	@echo "  uninstall-python - Uninstall Python package and remove backlog/bl entry points from CLI_LINK_DIRS"
	@echo "  build         - Build Go binary to repo root (same as build-go)"
	@echo "  build-go      - Build Go binary to repo root via scripts/compile-go.sh"
	@echo "  test          - Run Python, TypeScript, and Go tests"
	@echo "  test-python   - Run Python tests"
	@echo "  test-ts       - Run TypeScript tests"
	@echo "  test-go       - Run Go tests"
	@echo "  check         - Run Python tests, TypeScript checks, and Go check target"
	@echo "  check-python  - Run Python checks"
	@echo "  check-ts      - Run TypeScript checks"
	@echo "  check-go      - Run Go checks (go fmt, test, coverage threshold)"
	@echo "  clean         - Remove generated artifacts (including backlog-go)"
	@echo "  parity        - Run TypeScript parity checks"

setup: setup-python setup-ts setup-go

setup-python:
	$(PYTHON) -m pip install -e ".[dev]"

install-python:
	$(PYTHON) -m pip install .

install-python-with-links: install-python python-link

python-link:
	$(MAKE) cli-link CLI_LINK_SOURCE="$(PYTHON_BIN_DIR)" CLI_LINK_DIR="$(CLI_LINK_DIR)"

cli-link:
	@if [ -z "$(CLI_LINK_SOURCE)" ]; then \
	  echo "CLI_LINK_SOURCE is required. Example: make cli-link CLI_LINK_SOURCE=/path/to/bin"; \
	  exit 1; \
	fi
	mkdir -p "$(CLI_LINK_DIR)"
	@for bin in $(CLI_EXES); do \
	  src="$(CLI_LINK_SOURCE)/$$bin"; \
	  if [ -f "$$src" ] || [ -x "$$src" ]; then \
	    ln -sf "$$src" "$(CLI_LINK_DIR)/$$bin"; \
	    echo "Linked $$src -> $(CLI_LINK_DIR)/$$bin"; \
	  else \
	    echo "warning: $$src missing; skipped"; \
	  fi; \
	done

python-unlink:
	$(MAKE) cli-unlink

cli-unlink:
	@for dir in $(CLI_LINK_DIRS); do \
	  for bin in $(CLI_EXES); do \
	    target="$$dir/$$bin"; \
	    if [ -e "$$target" ] || [ -L "$$target" ]; then \
	      if [ -w "$$target" ] || [ -w "$$dir" ]; then \
	        rm -f "$$target"; \
	      else \
	        echo "skip removing $$target (permission denied)"; \
	      fi; \
	    fi; \
	  done; \
	done

setup-ts:
	cd "$(TS_DIR)" && $(BUN) install

install-ts: setup-ts ts-link

ts-link:
	$(MAKE) cli-link CLI_LINK_SOURCE="$(TS_DIR)/bin" CLI_LINK_DIR="$(CLI_LINK_DIR)"

setup-go:
	cd "$(GO_DIR)" && $(GO) mod download

uninstall-python:
	$(PYTHON) -m pip uninstall -y backlog-cli || true
	$(MAKE) cli-unlink

uninstall-ts:
	cd "$(TS_DIR)" && $(BUN) unlink || true
	cd "$(TS_DIR)" && rm -rf node_modules
	$(MAKE) cli-unlink

install-go:
install-go: build-go
	cd "$(GO_DIR)" && $(GO) install .
	$(MAKE) go-link

go-link:
	@mkdir -p "$(CLI_LINK_DIR)"
	@if [ ! -x "$(GO_BIN_DIR)/$(GO_EXE_NAME)" ]; then \
	  echo "warning: $(GO_BIN_DIR)/$(GO_EXE_NAME) missing; run '$(GO) install .' first"; \
	  exit 1; \
	fi
	@for bin in $(CLI_EXES); do \
	  ln -sf "$(GO_BIN_DIR)/$(GO_EXE_NAME)" "$(CLI_LINK_DIR)/$$bin"; \
	  echo "Linked $(GO_BIN_DIR)/$(GO_EXE_NAME) -> $(CLI_LINK_DIR)/$$bin"; \
	done

uninstall-go:
	rm -f "$(GO_BIN_DIR)/backlog" "$(GO_BIN_DIR)/backlog_go" "$(GO_BIN_DIR)/backlog-go"
	$(MAKE) cli-unlink

build: build-go

build-go:
	./scripts/compile-go.sh

test: test-python test-ts test-go

test-python:
	cd "$(PYTHON_DIR)" && pytest -q

test-ts:
	cd "$(TS_DIR)" && $(BUN) test

test-go:
	cd "$(GO_DIR)" && $(GO) test ./...

check: check-python check-ts check-go

check-python:
	cd "$(PYTHON_DIR)" && pytest -q

check-ts:
	cd "$(TS_DIR)" && $(BUN) run check

check-go:
	cd "$(GO_DIR)" && $(MAKE) check

parity:
	cd "$(TS_DIR)" && $(BUN) run parity

clean:
	rm -f "$(ROOT_BIN)"
	cd "$(GO_DIR)" && rm -f coverage.out
