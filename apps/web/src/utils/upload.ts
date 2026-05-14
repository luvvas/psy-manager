type UploadTarget = {
    uploadUrl: string;
    method: "PUT";
    headers: Record<string, string>;
};

export async function uploadFileToTarget(file: File, target: UploadTarget) {
    const response = await fetch(target.uploadUrl, {
        method: target.method,
        headers: target.headers,
        body: file,
    });

    if (!response.ok) {
        throw new Error("Nao foi possivel enviar o arquivo.");
    }
}
