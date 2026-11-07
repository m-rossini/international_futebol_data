import type { Metadata } from 'next';
import { DataStamp } from '@/components/shared/DataStamp';

export const metadata: Metadata = {
  title: 'About — International Football Stats',
  description:
    'About International Football Stats: a comprehensive database of international football match results from 1872 to present.',
};

interface Credit {
  name: string;
  href: string;
  use: string;
  licence: string;
  licenceHref: string;
  status: 'Used now' | 'Planned';
}

const CREDITS: Credit[] = [
  {
    name: 'international_results',
    href: 'https://github.com/m-rossini/international_results',
    use: 'Men’s international results, goalscorers, shootouts and former team names — the core dataset.',
    licence: 'CC0 1.0',
    licenceHref: 'https://creativecommons.org/publicdomain/zero/1.0/',
    status: 'Used now',
  },
  {
    name: 'RSSSF',
    href: 'https://www.rsssf.org/',
    use: 'Historical results compiled upstream of the core dataset.',
    licence: 'Upstream source',
    licenceHref: 'https://www.rsssf.org/',
    status: 'Used now',
  },
  {
    name: 'Wikipedia',
    href: 'https://www.wikipedia.org/',
    use: 'Historical results and tournament records compiled upstream of the core dataset.',
    licence: 'CC BY-SA 4.0',
    licenceHref: 'https://creativecommons.org/licenses/by-sa/4.0/',
    status: 'Used now',
  },
  {
    name: 'Dixon & Coles (1997)',
    href: 'https://doi.org/10.1111/1467-9884.00068',
    use: 'Bivariate Poisson model behind the match simulation.',
    licence: 'Academic paper',
    licenceHref: 'https://doi.org/10.1111/1467-9884.00068',
    status: 'Used now',
  },
  {
    name: 'StatsBomb Open Data',
    href: 'https://github.com/statsbomb/open-data',
    use: 'Event data, lineups and 360 freeze frames for selected competitions.',
    licence: 'StatsBomb Public Data User Agreement',
    licenceHref: 'https://github.com/statsbomb/open-data/blob/master/LICENSE.pdf',
    status: 'Planned',
  },
  {
    name: 'OpenFootball',
    href: 'https://github.com/openfootball',
    use: 'Tournament squad lists.',
    licence: 'Public domain',
    licenceHref: 'https://github.com/openfootball',
    status: 'Planned',
  },
  {
    name: 'Wikidata',
    href: 'https://www.wikidata.org/',
    use: 'Player dates of birth, positions and aliases.',
    licence: 'CC0 1.0',
    licenceHref: 'https://www.wikidata.org/wiki/Wikidata:Licensing',
    status: 'Planned',
  },
];

export default function AboutPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">About International Football Stats</h1>

      <div className="prose prose-gray max-w-none space-y-6 text-gray-700 leading-relaxed">
        <p>
          International Football Stats is a comprehensive database of international football match
          results dating back to the first ever international match in 1872. It provides detailed
          statistics, historical data, and analytical tools for exploring the rich history of
          international football.
        </p>

        <DataStamp />

        <h2 className="text-xl font-semibold text-gray-800 mt-8">Data Coverage</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            <strong>Teams:</strong> 300+ teams including FIFA members, CONIFA teams, historical
            nations (Soviet Union, Czechoslovakia, Yugoslavia, East/West Germany), and non-FIFA
            teams (Basque Country, Catalonia, Kurdistan)
          </li>
          <li>
            <strong>Tournaments:</strong> 200+ competitions including FIFA World Cup, UEFA Euro,
            Copa América, African Cup of Nations, AFC Asian Cup, CONCACAF Gold Cup, Olympic Games,
            CONIFA World Cup, and friendlies
          </li>
          <li>
            <strong>Countries:</strong> 200+ countries where matches have been played
          </li>
          <li>
            <strong>Cities:</strong> 2000+ host cities across the globe
          </li>
          <li>
            <strong>Goal Scorers:</strong> Individual goal scorer data for many matches
          </li>
          <li>
            <strong>Shootouts:</strong> Penalty shootout results
          </li>
        </ul>

        <h2 className="text-xl font-semibold text-gray-800 mt-8">Features</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            <strong>Team Profiles:</strong> Browse any team&apos;s full match history, win/draw/loss
            record, goals scored/conceded, and ELO rating trajectory
          </li>
          <li>
            <strong>Tournament Details:</strong> View all seasons of a tournament with standings and
            results
          </li>
          <li>
            <strong>Head-to-Head:</strong> Compare any two teams with cumulative wins charts, goal
            difference, and full match history
          </li>
          <li>
            <strong>ELO Rankings:</strong> Real-time ELO ratings calculated from historical match
            results using the standard formula
          </li>
          <li>
            <strong>Decade Leaders:</strong> See which teams dominated each decade based on average
            ELO rating
          </li>
          <li>
            <strong>Flag Report:</strong> Visual mapping of teams to their national flags and
            countries
          </li>
        </ul>

        <h2 className="text-xl font-semibold text-gray-800 mt-8">ELO Rating System</h2>
        <p>The ELO rating system used here follows the standard approach adapted for football:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            <strong>K-factor:</strong> 20 (determines rating sensitivity)
          </li>
          <li>
            <strong>Expected score:</strong> Calculated from rating difference between teams
          </li>
          <li>
            <strong>Home advantage:</strong> +100 ELO points for the home team
          </li>
          <li>
            <strong>Goal difference multiplier:</strong> Larger victories yield more rating points
          </li>
          <li>
            <strong>Match importance:</strong> Friendly matches have reduced weight
          </li>
        </ul>

        <h2 className="text-xl font-semibold text-gray-800 mt-8">API & MCP Server</h2>
        <p>
          The site exposes a REST API at{' '}
          <code className="bg-gray-100 px-1 rounded">/api/proxy/</code> with endpoints for teams,
          tournaments, matches, rankings, and filters. An MCP (Model Context Protocol) server is
          also available for AI assistants to query the database programmatically.
        </p>

        <h2 className="text-xl font-semibold text-gray-800 mt-8">Credits</h2>
        <p>
          This project builds on data and research published by other people. Sources marked
          <em> Used now</em> are part of the current dataset; sources marked <em>Planned</em> are
          approved for upcoming features and are listed here in advance.
        </p>
        <div className="overflow-x-auto mt-4">
          <table className="w-full text-sm text-left border border-gray-200 rounded-lg overflow-hidden">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="px-3 py-2 font-semibold">Source</th>
                <th className="px-3 py-2 font-semibold">What it provides</th>
                <th className="px-3 py-2 font-semibold">Licence</th>
                <th className="px-3 py-2 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {CREDITS.map((credit) => (
                <tr key={credit.name} className="border-t border-gray-200 align-top">
                  <td className="px-3 py-2 whitespace-nowrap">
                    <a
                      href={credit.href}
                      className="text-blue-600 hover:underline"
                      target="_blank"
                      rel="noreferrer"
                    >
                      {credit.name}
                    </a>
                  </td>
                  <td className="px-3 py-2 text-gray-600">{credit.use}</td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <a
                      href={credit.licenceHref}
                      className="text-blue-600 hover:underline"
                      target="_blank"
                      rel="noreferrer"
                    >
                      {credit.licence}
                    </a>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-gray-500">{credit.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-sm text-gray-500">
          Built with Next.js, Python FastAPI, CSV data and Docker. ELO ratings are calculated by
          this project from the match results above.
        </p>
      </div>
    </div>
  );
}
