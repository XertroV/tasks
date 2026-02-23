GO := go
COVERAGE_THRESHOLD ?= 95
COVERAGE_FILE := coverage.out

.PHONY: help tidy fmt fmt-check test coverage coverage-check check clean

help:
	@echo "Available targets:"
	@echo "  tidy           - Sync module files (go mod tidy)"
	@echo "  fmt            - Format all Go files (gofmt)"
	@echo "  fmt-check      - Fail if formatting changes are needed"
	@echo "  test           - Run unit tests"
	@echo "  coverage       - Generate coverage profile"
	@echo "  coverage-check - Generate coverage and enforce threshold"
	@echo "  check          - Run fmt-check, test, and coverage-check"
	@echo "  clean          - Remove generated artifacts"

tidy:
	$(GO) mod tidy

fmt:
	$(GO) fmt ./...

fmt-check:
	@diff_output="$$(gofmt -l $$(find . -name '*.go' -not -path './vendor/*' -not -path './.git/*' ))"; \
	if [ -n "$${diff_output}" ]; then \
		echo "Formatting issues detected in:"; \
		echo "$${diff_output}"; \
		echo "Run 'make fmt' to fix."; \
		exit 1; \
	fi

test:
	$(GO) test ./...

coverage:
	$(GO) test -coverprofile=$(COVERAGE_FILE) ./...

coverage-check: coverage
	bash ./scripts/check-coverage.sh $(COVERAGE_THRESHOLD) $(COVERAGE_FILE)

check: fmt-check test coverage-check

clean:
	rm -f $(COVERAGE_FILE)
