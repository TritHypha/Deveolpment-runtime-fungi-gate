package main

import (
	"encoding/json"
	"fmt"
	"os"
	"runtime"
	"strconv"
	"time"
)

const defaultIterations = 50000

var resultSink int64

//go:noinline
func leafCompute(salt int64, x int64) int64 {
	return (salt+x)*2 + 1
}

type domainLayer struct{}

//go:noinline
func (domainLayer) compute(salt int64, x int64) int64 {
	return leafCompute(salt, x) + leafCompute(salt, x+1)
}

type serviceLayer struct{ domain domainLayer }

//go:noinline
func (service serviceLayer) process(salt int64, x int64) int64 {
	return service.domain.compute(salt, x) + service.domain.compute(salt, x+2)
}

//go:noinline
func chain(iterations int) int64 {
	service := serviceLayer{}
	checksum := int64(0)
	for index := 0; index < iterations; index++ {
		value := int64(index)
		checksum = (checksum + service.process(value, value)) % 65536
	}
	return checksum
}

func iterationsFromArgs() (int, error) {
	iterations := defaultIterations
	for index := 1; index < len(os.Args); index++ {
		if os.Args[index] != "--iterations" && os.Args[index] != "--operations" {
			continue
		}
		if index+1 >= len(os.Args) {
			return 0, fmt.Errorf("missing iteration count")
		}
		value, err := strconv.Atoi(os.Args[index+1])
		if err != nil || value != defaultIterations {
			return 0, fmt.Errorf("iteration count must be %d", defaultIterations)
		}
		iterations = value
		index++
	}
	return iterations, nil
}

func main() {
	iterations, err := iterationsFromArgs()
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(2)
	}
	chain(iterations)
	const measurementRepeats = 25
	started := time.Now()
	result := int64(0)
	for repeat := 0; repeat < measurementRepeats; repeat++ {
		result = chain(iterations)
	}
	resultSink = result
	runtime.KeepAlive(resultSink)
	elapsedTotal := time.Since(started)
	elapsed := elapsedTotal / measurementRepeats
	seconds := elapsed.Seconds()
	if seconds <= 0 {
		fmt.Fprintln(os.Stderr, "elapsed time is not positive")
		os.Exit(3)
	}
	report := map[string]any{
		"runtime": "go",
		"benchmark": "call-chain-v1",
		"result": result,
		"iterations": iterations,
		"callsPerIteration": 7,
		"measurementRepeats": measurementRepeats,
		"elapsedMs": float64(elapsed.Nanoseconds()) / 1e6,
		"iterationsPerSecond": float64(iterations) / seconds,
		"callsPerSecond": float64(iterations*7) / seconds,
		"process": map[string]any{"go": runtime.Version(), "platform": runtime.GOOS, "arch": runtime.GOARCH},
	}
	encoder := json.NewEncoder(os.Stdout)
	encoder.SetIndent("", "  ")
	if err := encoder.Encode(report); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(4)
	}
}
