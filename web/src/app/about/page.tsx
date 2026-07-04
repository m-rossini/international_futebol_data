import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About — International Football Stats',
  description:
    'About International Football Stats: a comprehensive database of international football match results from 1872 to present.',
};

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
          Data sourced from various public international football result datasets. ELO rating
          implementation based on the standard chess ELO system adapted for football. Built with
          Next.js, Python FastAPI, and deployed on IONOS VPS with Docker.
        </p>
      </div>
    </div>
  );
}
