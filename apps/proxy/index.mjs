import chalk from 'chalk';
import http from 'node:http';

const NEXT_PORT = process.env.NEXT_PORT ? Number(process.env.NEXT_PORT) : 3000;
const PROXY_PORT = process.env.PROXY_PORT
  ? Number(process.env.PROXY_PORT)
  : 3001;

const colors = ['green', 'yellow', 'blue', 'magenta', 'cyan', 'gray', 'grey'];

// Maps *.localhost subdomains to the real hostnames the Next.js middleware
// uses for site resolution via siteConfigDomainMap.
const domainMap = {
  'truecrime-tv.localhost': 'truecrime-tv.co.uk',
  'truecrimextra-tv.localhost': 'truecrimextra-tv.co.uk',
  'legend-tv.localhost': 'legend-tv.co.uk',
  'legendxtra-tv.localhost': 'legendxtra-tv.co.uk',
};

const server = http.createServer((req, res) => {
  const [hostname] = (req.headers.host ?? '').split(':');
  const mappedHost = domainMap[hostname] ?? 'truecrime-tv.co.uk';

  const options = {
    hostname: 'localhost',
    port: NEXT_PORT,
    path: req.url,
    method: req.method,
    headers: { ...req.headers, host: mappedHost },
  };

  const proxyReq = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res, { end: true });
  });

  proxyReq.on('error', (err) => {
    console.error(
      chalk.red(`[proxy] ${req.method} ${req.url} → ${err.message}`)
    );
    res.writeHead(502);
    res.end('Bad Gateway');
  });

  req.pipe(proxyReq, { end: true });
});

server.listen(PROXY_PORT, () => {
  console.log(
    chalk.inverse.bold(
      '-- Domain Mappings: ----------------------------------------------------'
    )
  );
  const domainEntries = Object.entries(domainMap);
  for (const [index, [local, real]] of domainEntries.entries()) {
    console.log(
      chalk[colors[index % colors.length]].bold(
        `http://${local}:${PROXY_PORT}) → ${real} → Next.js :${NEXT_PORT}`
      )
    );
  }
  console.log(
    chalk.inverse.bold(
      '-- End Domain Mappings: ------------------------------------------------'
    )
  );
});
