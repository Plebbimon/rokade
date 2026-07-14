import Link from "next/link";
import { redirect } from "next/navigation";
import { clubMembers, userClubs, type ClubMember, type ClubWithRole } from "@rokade/db";
import { requireUser } from "@/lib/auth";
import { addMemberAction, createClubAction } from "@/lib/club-actions";
import { db, isMultiUser } from "@/lib/store";

export const dynamic = "force-dynamic";

const ROLE_LABEL: Record<string, string> = { admin: "administrator", arbiter: "turneringsleder" };

function MemberList({ club, members }: { club: ClubWithRole; members: ClubMember[] }) {
  return (
    <section>
      <h2>
        {club.name} <span className="muted">({ROLE_LABEL[club.role]})</span>
      </h2>
      <ul className="plain">
        {members.map((m) => (
          <li key={m.userId}>
            {m.email} <span className="muted">{ROLE_LABEL[m.role]}</span>
          </li>
        ))}
      </ul>
      {club.role === "admin" ? (
        <form action={addMemberAction} className="row">
          <input type="hidden" name="clubId" value={club.id} />
          <input name="email" type="email" required placeholder="ny@medlem.no" />
          <select name="role" defaultValue="arbiter">
            <option value="arbiter">Turneringsleder</option>
            <option value="admin">Administrator</option>
          </select>
          <button type="submit">Legg til medlem</button>
        </form>
      ) : null}
    </section>
  );
}

export default async function ClubsPage() {
  if (!isMultiUser()) redirect("/turneringer");
  const user = (await requireUser())!;
  const clubs = await userClubs(db(), user.id);
  const members = await Promise.all(clubs.map((club) => clubMembers(db(), club.id)));

  return (
    <main>
      <p>
        <Link href="/turneringer">← Turneringer</Link>
      </p>
      <h1>Klubber</h1>

      {clubs.length === 0 ? (
        <p className="lead">
          Du er ikke medlem i noen klubb ennå. Opprett klubben din nedenfor, eller be klubbens
          administrator legge deg til med e-postadressen din.
        </p>
      ) : (
        clubs.map((club, i) => <MemberList key={club.id} club={club} members={members[i]!} />)
      )}

      <h2>Ny klubb</h2>
      <p className="muted">Den som oppretter klubben blir dens første administrator.</p>
      <form action={createClubAction} className="stack">
        <label>
          Klubbnavn
          <input name="name" required placeholder="Bergens Schakklub" />
        </label>
        <button type="submit">Opprett klubb</button>
      </form>
    </main>
  );
}
