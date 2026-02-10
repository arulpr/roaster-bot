# Performance Optimization Guidelines

This document outlines areas for manual review to optimize the application's performance.

## 1. Inefficient Loops & Redundant Computations

**Review:** Examine all iterative operations (e.g., `for`, `forEach`, `map`, `filter`, `reduce`) and recursive functions, especially within frequently called API endpoints. Look for:
-   **Nested loops:** Can these be optimized with hash maps or more efficient algorithms?
-   **Repeated calculations:** Are you computing the same value multiple times within a loop or across different parts of a request handler? Store results in variables or cache them.
-   **Unnecessary operations:** Are there operations inside a loop that could be moved outside or performed once?
-   **String concatenations in loops:** Use template literals or `Array.join()` for better performance.

**Action:** Profile hot paths using Node.js `perf_hooks` or a dedicated APM tool. Refactor code to reduce complexity and avoid redundant work.

## 2. N+1 External API/Database Calls

**Review:** Identify code sections where a primary API call or data fetch is followed by `N` additional, separate calls to fetch related data or enrich results, typically within a loop.
-   **Example in this project:** If you fetch a list of items and then, for each item, make a separate `openai` call to get a 'roast' or description. This would result in `1 + N` OpenAI calls.

**Action:** 
-   **Batching:** If the external API (e.g., OpenAI) supports batch requests, collect all `N` related requests and send them in a single batch call.
-   **Pre-fetching/Eager Loading:** Anticipate what related data will be needed and fetch it in fewer, more comprehensive queries/calls.
-   **Caching:** Store results of frequently accessed external calls if the data is not rapidly changing.

## 3. Memory Leaks

**Review:** Memory leaks in Node.js applications often stem from:
-   **Unclosed resources:** Open database connections, file handles, network sockets, or event listeners that are not properly closed or removed.
-   **Global caches/objects:** Caches that grow indefinitely without eviction policies.
-   **Closures:** Large variables captured by closures that prevent garbage collection.
-   **Event Emitter misuse:** Event listeners attached but never removed, leading to increasing memory usage over time.

**Action:**
-   **Monitoring:** Use Node.js built-in `process.memoryUsage()` or dedicated memory profiling tools (e.g., `heapdump`, Chrome DevTools for Node.js) to monitor memory over time.
-   **Resource Management:** Ensure all `stream`, `socket`, `connection`, and `event listener` resources are properly opened and closed/disposed.
-   **Cache Policies:** Implement size limits, time-to-live (TTL), or least-recently-used (LRU) policies for any in-memory caches.

## 4. Pagespeed Optimization (Backend Context)

**Review:** For a backend service, 'pagespeed optimization' primarily translates to **API response time optimization** and **efficient resource delivery**.

**Action:**
-   **API Response Time:** Focus on reducing the latency of your API endpoints. This involves:
    -   Optimizing database queries (if any).
    -   Reducing the number of external API calls (see N+1).
    -   Implementing caching for frequently requested data.
    -   Optimizing CPU-intensive computations.
-   **Payload Size:** Reduce the size of JSON responses by only sending necessary data.
-   **Compression:** Ensure your Express server is configured to use GZIP/Brotli compression for responses (often handled by a reverse proxy like Nginx or cloud load balancers, but can be added with `compression` middleware if needed).
-   **Asynchronous Operations:** Use `async/await` effectively to prevent blocking the event loop during I/O operations.