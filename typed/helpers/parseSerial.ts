export function parseSerial(raw: number[]): string{
    const data = new Array(raw.length);
    for (let i = 0; i < raw.length; i = i + 1){
        data[i] = raw[i]
    };

    let serialNo = Buffer.from(raw).slice(0, 4).toString();

    data.slice(4).forEach((item) => {
        serialNo += item.toString(16).toUpperCase().padStart(2, "0");
    });

    console.log({ serialDecode: serialNo });
    return serialNo;
}