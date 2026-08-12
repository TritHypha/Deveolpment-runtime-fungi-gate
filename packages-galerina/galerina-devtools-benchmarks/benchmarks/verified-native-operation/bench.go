package main

import (
	"encoding/json"
	"os"
	"sort"
	"time"
)

const (
	iterations = 1_000_000
	warmups    = 2
	samples    = 9
)

//go:noinline
func observedRead(value int32) int32 {
	return value
}

//go:noinline
func traverse(values []int32) (int32, int) {
	var last int32
	index := 0
	for index < iterations {
		last = observedRead(values[index])
		index++
	}
	return last, index
}

type benchmarkResult struct {
	Runtime             string  `json:"runtime"`
	Iterations          int     `json:"iterations"`
	Result              int32   `json:"result"`
	SamplesNS           []int64 `json:"samplesNs"`
	MedianNS            int64   `json:"medianNs"`
	OperationsPerSecond int64   `json:"operationsPerSecond"`
	Unit                string  `json:"unit"`
	AntiElision         string  `json:"antiElision"`
}

func main() {
	values := make([]int32, iterations)
	for index := range values {
		values[index] = int32(index)
	}

	for warmup := 0; warmup < warmups; warmup++ {
		last, observed := traverse(values)
		if last != 999_999 || observed != iterations {
			panic("REFUSED: warmup semantic mismatch")
		}
	}

	measured := make([]int64, 0, samples)
	for sample := 0; sample < samples; sample++ {
		started := time.Now()
		last, observed := traverse(values)
		elapsed := time.Since(started).Nanoseconds()
		if last != 999_999 || observed != iterations {
			panic("REFUSED: measured semantic mismatch")
		}
		if elapsed <= 0 {
			panic("REFUSED: timer resolution mismatch")
		}
		measured = append(measured, elapsed)
	}

	ordered := append([]int64(nil), measured...)
	sort.Slice(ordered, func(left, right int) bool { return ordered[left] < ordered[right] })
	median := ordered[len(ordered)/2]
	result := benchmarkResult{
		Runtime:             "go",
		Iterations:          iterations,
		Result:              999_999,
		SamplesNS:           measured,
		MedianNS:            median,
		OperationsPerSecond: (iterations * 1_000_000_000) / median,
		Unit:                "element-reads/s",
		AntiElision:         "noinline-observed-read-per-index-and-observed-last-value",
	}
	if err := json.NewEncoder(os.Stdout).Encode(result); err != nil {
		panic(err)
	}
}
