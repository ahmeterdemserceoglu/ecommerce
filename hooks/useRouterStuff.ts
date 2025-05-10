import { usePathname, useSearchParams, useRouter } from 'next/navigation';
// Assuming useRouter is also imported, either from 'next/router' or 'next/navigation'
// import { useRouter } from 'next/navigation'; // or 'next/router'

export interface RouterStuff {
    router: ReturnType<typeof useRouter>;
    pathname: string;
    searchParams: URLSearchParams;
    query: Record<string, string | string[] | undefined>;
    // Add any other specific properties your original hook might have returned,
    // ensuring they handle a potentially null/undefined initial pathname.
    // For example, if there was a value based on pathname.replace():
    // someReplacedValue: string;
}

export function useRouterStuff(): RouterStuff {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const router = useRouter();

    const currentPath = pathname || '';

    // Construct query object from searchParams
    const query: Record<string, string | string[] | undefined> = {};
    searchParams.forEach((value, key) => {
        // Handle multiple values for the same key, though typically not needed for basic query access
        if (query[key] === undefined) {
            query[key] = value;
        } else if (Array.isArray(query[key])) {
            (query[key] as string[]).push(value);
        } else {
            query[key] = [query[key] as string, value];
        }
    });

    // Example: if the original hook had a value derived using .replace()
    // const someReplacedValue = currentPath ? currentPath.replace('/admin', '') : '';

    return {
        router,
        pathname: currentPath,
        searchParams,
        query,
        // someReplacedValue, // Uncomment and adapt if needed
    };
} 