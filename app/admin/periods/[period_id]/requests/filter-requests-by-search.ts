interface SearchableRequest {
    owner?: string | null;
    assignment?: { id: string } | null;
    pastAssignment?: { id: string } | null;
}

/**
 * Keeps requests whose student display name, or assigned equipment ID, contains the
 * search text (case-insensitive). An empty search keeps everything.
 */
export default function filterRequestsBySearch<T extends SearchableRequest>(
    requests: T[],
    search: string,
    getDisplayName: (request: T) => string
): T[] {
    const query = search.trim().toLowerCase();
    if (query === '') {
        return requests;
    }

    return requests.filter(request => {
        const equipmentId = (request.assignment ?? request.pastAssignment)?.id ?? '';
        return (
            getDisplayName(request).toLowerCase().includes(query) ||
            equipmentId.toLowerCase().includes(query)
        );
    });
}
